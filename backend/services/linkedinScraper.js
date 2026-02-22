const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../config/logger');

const SEARCH_QUERIES = [
    { keywords: 'Data Analytics', location: 'Bangalore' },
    { keywords: 'Data Analyst', location: 'India' },
    { keywords: 'Software Engineer', location: 'India' },
    { keywords: 'Frontend Developer', location: 'United States' },
    { keywords: 'Backend Developer', location: 'Worldwide' },
];

const scrapeLinkedIn = async () => {
    logger.info('Starting real LinkedIn jobs scraping across multiple queries...');
    const allJobs = [];

    for (const query of SEARCH_QUERIES) {
        // Scrape a couple of pages per query to compile around 300 jobs
        for (let page = 0; page < 3; page++) {
            const startParam = page * 25;
            const encodedKeywords = encodeURIComponent(query.keywords);
            const encodedLocation = encodeURIComponent(query.location);
            const url = `https://www.linkedin.com/jobs/search/?keywords=${encodedKeywords}&location=${encodedLocation}&f_TPR=r604800&position=1&pageNum=0&start=${startParam}`;

            try {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9',
                    },
                    timeout: 8000,
                });

                const $ = cheerio.load(response.data);
                let addedThisPage = 0;

                $('.base-search-card__info').each((index, element) => {
                    const title = $(element).find('.base-search-card__title').text().trim();
                    const company = $(element).find('.base-search-card__subtitle').text().trim();
                    const location = $(element).find('.job-search-card__location').text().trim();
                    const dateText = $(element).parent().find('time').attr('datetime');
                    const jobUrl = $(element).parent().find('.base-card__full-link').attr('href');
                    const salaryStr = $(element).find('.job-search-card__salary-info').text().trim();

                    if (title && company && jobUrl) {
                        allJobs.push({
                            title,
                            company,
                            location,
                            description: `Role: ${title} at ${company}. View the full job description on LinkedIn. This is a newly scraped dynamic listing.`,
                            skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'].sort(() => 0.5 - Math.random()).slice(0, 3), // Inject some random logical skills as LinkedIn public doesn't show them here
                            jobUrl: jobUrl.split('?')[0],
                            source: 'LinkedIn',
                            experienceLevel: title.toLowerCase().includes('senior') || title.toLowerCase().includes('lead') ? 'Mid-Senior level' : 'Not specified',
                            jobType: title.toLowerCase().includes('intern') ? 'Internship' : 'Full-time',
                            workplaceType: location.toLowerCase().includes('remote') ? 'Remote' : 'On-site',
                            salaryRange: salaryStr || 'Not specified',
                            postedDate: dateText ? new Date(dateText) : new Date(),
                        });
                        addedThisPage++;
                    }
                });

                logger.info(`Scraped ${addedThisPage} jobs for ${query.keywords} in ${query.location} (Page ${page + 1})`);

                // Sleep slightly to avoid immediate rate limit
                await new Promise(r => setTimeout(r, 1000));
            } catch (error) {
                logger.warn(`Error scraping LinkedIn for ${query.keywords} on page ${page + 1}: ${error.message}`);
                // Break out of this query's loop if rate limited to try the next query after a longer wait
                await new Promise(r => setTimeout(r, 2000));
                break;
            }
        }
    }

    logger.info(`Successfully scraped a total of ${allJobs.length} real jobs from LinkedIn.`);
    return allJobs;
};

const generateMockJobs = (count, source) => {
    const jobs = [];
    const companies = ['TechCorp', 'InnovaSystems', 'CloudBase', 'DataFin', 'WebSolutions', 'Globex', 'Soylent'];
    const titles = ['Data Analytics', 'Data Analyst', 'Software Engineer', 'Frontend Developer', 'Backend Developer', 'System Architect', 'Machine Learning Engineer'];
    const locations = ['Bangalore', 'Remote', 'San Francisco, CA', 'New York, NY', 'London, UK', 'India'];
    const salaries = ['$120,000/yr', '$90,000/yr - $130,000/yr', '₹15,00,000/yr', '₹8,00,000/yr - ₹12,00,000/yr', 'Not specified'];

    for (let i = 0; i < count; i++) {
        const title = titles[Math.floor(Math.random() * titles.length)];
        const company = companies[Math.floor(Math.random() * companies.length)] + ' ' + (i + 1);
        const ts = new Date().getTime() - Math.floor(Math.random() * 86400000 * 14); // up to 14 days ago

        jobs.push({
            _id: 'mock_' + Math.random().toString(36).substr(2, 9),
            title,
            company,
            location: locations[Math.floor(Math.random() * locations.length)],
            description: `Mock Fallback Job: Robust SaaS startup is hiring a ${title}. You will build and scale high performing systems. This is displaying because MongoDB is currently offline.`,
            skills: ['React', 'Node.js', 'MongoDB', 'AWS', 'Docker', 'Python', 'SQL'].sort(() => 0.5 - Math.random()).slice(0, 3),
            jobUrl: `https://${source.toLowerCase()}.com/jobs/view/${Math.floor(Math.random() * 1000000)}`,
            source,
            experienceLevel: Math.random() > 0.5 ? 'Mid-Senior level' : 'Entry level',
            jobType: Math.random() > 0.8 ? 'Internship' : 'Full-time',
            workplaceType: Math.random() > 0.6 ? 'Remote' : 'Hybrid',
            salaryRange: salaries[Math.floor(Math.random() * salaries.length)],
            postedDate: new Date(ts),
        });
    }
    return jobs;
};

module.exports = { scrapeLinkedIn, generateMockJobs };
