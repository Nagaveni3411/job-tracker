const Job = require('../models/Job');
const logger = require('../config/logger');
const { generateJobHash } = require('./cryptoUtils');
const { scrapeLinkedIn } = require('./linkedinScraper');

const syncJobs = async (io) => {
    logger.info('Starting daily real job sync pipeline...');
    try {
        let allScrapedJobs = [];

        // Realistic scraping from live source
        const linkedinJobs = await scrapeLinkedIn();
        allScrapedJobs = [...linkedinJobs];

        let newJobsCount = 0;
        const newJobsData = [];

        for (const job of allScrapedJobs) {
            if (!job.title || !job.company || !job.jobUrl) continue; // Data normalization and validation

            const hash = generateJobHash(job.title, job.company, job.jobUrl);

            const exists = await Job.findOne({ hash });
            if (!exists) {
                const newJob = new Job({ ...job, hash });
                await newJob.save();
                newJobsCount++;
                newJobsData.push(newJob);
            }
        }

        logger.info(`Job sync complete. Safely inserted ${newJobsCount} highly normalized new jobs out of ${allScrapedJobs.length} successfully scraped from real sources.`);

        // Notify front-end components
        if (newJobsCount > 0 && io) {
            io.emit('new_jobs', { count: newJobsCount, newJobs: newJobsData });
        }

        // Maintain database health by removing stale entries
        const activeJobsCount = await Job.countDocuments({ status: 'Active' });
        if (activeJobsCount > 500) {
            logger.info('Performing garbage collection on stale jobs to maintain SaaS standard DB health limit...');
            const oldestJobs = await Job.find({ status: 'Active' }).sort('postedDate').limit(activeJobsCount - 300);
            for (const oldJob of oldestJobs) {
                oldJob.status = 'Closed';
                await oldJob.save();
            }
        }

        return newJobsData;
    } catch (error) {
        logger.error(`Error in automated syncJobs pipeline: ${error.message}`);
        throw error;
    }
};

module.exports = { syncJobs };
