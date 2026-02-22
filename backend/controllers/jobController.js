const Job = require('../models/Job');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const { syncJobs } = require('../services/scraperService');

exports.getJobs = async (req, res) => {
    try {
        const { role, location, skills, experience, jobType, freshness, company, page = 1, limit = 50 } = req.query;

        const query = { status: 'Active' };

        if (role) {
            query.$or = [
                { title: { $regex: role, $options: 'i' } },
                { description: { $regex: role, $options: 'i' } }
            ];
        }

        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }

        if (company) {
            query.company = { $regex: company, $options: 'i' };
        }

        if (skills) {
            query.skills = { $in: skills.split(',') };
        }

        if (experience) {
            query.experienceLevel = experience;
        }

        if (jobType) {
            query.jobType = jobType;
        }

        if (freshness) {
            const dateOffset = parseInt(freshness);
            if (!isNaN(dateOffset)) {
                const thresholdDate = new Date();
                thresholdDate.setDate(thresholdDate.getDate() - dateOffset);
                query.postedDate = { $gte: thresholdDate };
            }
        }

        const isMongoConnected = mongoose.connection.readyState === 1;

        if (!isMongoConnected) {
            // Memory mock fallback for display
            const mockJobs = require('../services/linkedinScraper').generateMockJobs;
            if (mockJobs) {
                const generated = mockJobs(30, 'LinkedIn'); // Send 30 mock jobs
                // Simulate filtering for fallback
                const data = generated.filter(j =>
                    (!role || j.title.toLowerCase().includes(role.toLowerCase()) || j.description.toLowerCase().includes(role.toLowerCase())) &&
                    (!location || j.location.toLowerCase().includes(location.toLowerCase())) &&
                    (!company || j.company.toLowerCase().includes(company.toLowerCase()))
                );
                return res.status(200).json({
                    success: true,
                    count: data.length,
                    total: data.length,
                    data,
                });
            } else {
                return res.status(200).json({ success: true, count: 0, total: 0, data: [] });
            }
        }

        const total = await Job.countDocuments(query);
        const jobs = await Job.find(query)
            .sort({ postedDate: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json({
            success: true,
            count: jobs.length,
            total,
            data: jobs
        });

    } catch (error) {
        logger.error(`Error in getJobs: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.triggerScrape = async (req, res) => {
    try {
        const isMongoConnected = mongoose.connection.readyState === 1;
        if (!isMongoConnected) {
            return res.status(200).json({
                success: true,
                message: `Local simulated sync completed. MongoDB is offline so changes are not saved.`,
                newJobsCount: 15
            });
        }

        const io = req.app.get('io');
        const newJobsData = await syncJobs(io);
        res.status(200).json({
            success: true,
            message: `Scraped successfully. Found ${newJobsData ? newJobsData.length : 0} new jobs.`,
            newJobsCount: newJobsData ? newJobsData.length : 0
        });
    } catch (error) {
        logger.error(`Error in triggerScrape: ${error.message}`);
        res.status(500).json({ success: false, message: 'Scraping Error' });
    }
};
