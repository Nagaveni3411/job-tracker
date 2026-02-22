const { syncJobs } = require('../services/scraperService');
const { generateJobHash } = require('../services/cryptoUtils');
const mongoose = require('mongoose');

// Mock Dependencies
jest.mock('../services/linkedinScraper', () => ({
    scrapeLinkedIn: jest.fn(),
    generateMockJobs: jest.fn()
}));
jest.mock('../models/Job');
jest.mock('../config/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

const { scrapeLinkedIn, generateMockJobs } = require('../services/linkedinScraper');
const Job = require('../models/Job');

describe('Scraper Service - syncJobs', () => {
    let mockIo;

    beforeEach(() => {
        jest.clearAllMocks();
        mockIo = { emit: jest.fn() };

        // Default mocks
        Job.findOne.mockResolvedValue(null);
        Job.prototype.save = jest.fn().mockResolvedValue(true);
        Job.countDocuments.mockResolvedValue(100);
        Job.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }) });
    });

    test('should handle scraping failures and empty responses gracefully', async () => {
        // 1. Scraping failure/rate limit simulation for LinkedIn
        scrapeLinkedIn.mockRejectedValue(new Error('Rate Limited 429'));
        generateMockJobs.mockReturnValue([]);

        try {
            await syncJobs(mockIo);
        } catch (e) {
            // It should throw the error which was logged
            expect(e.message).toBe('Rate Limited 429');
        }
    });

    test('should skip duplicate entries', async () => {
        const mockJobs = [{
            title: 'Dev',
            company: 'Acme',
            jobUrl: 'http://acme.com/job1',
            source: 'LinkedIn'
        }];
        scrapeLinkedIn.mockResolvedValue(mockJobs);
        generateMockJobs.mockReturnValue([]);

        // Simulate job existing
        Job.findOne.mockResolvedValue({ id: 'existing-job' });

        await syncJobs(mockIo);

        // Save should NOT have been called due to deduplication
        expect(Job.prototype.save).not.toHaveBeenCalled();
        expect(mockIo.emit).not.toHaveBeenCalled();
    });

    test('should skip invalid entries (empty URLs or titles)', async () => {
        const mockJobs = [{ title: '', company: 'Acme', jobUrl: '', source: 'LinkedIn' }];
        scrapeLinkedIn.mockResolvedValue(mockJobs);
        generateMockJobs.mockReturnValue([]);

        await syncJobs(mockIo);

        // Save should not be called because title/url are invalid
        expect(Job.prototype.save).not.toHaveBeenCalled();
    });

    test('should successfully insert valid unique jobs', async () => {
        const mockJobs = [{
            title: 'Engineer',
            company: 'Tech',
            jobUrl: 'http://tech.com/job',
            source: 'LinkedIn'
        }];
        scrapeLinkedIn.mockResolvedValue(mockJobs);
        generateMockJobs.mockReturnValue([]); // No fallbacks for this test

        Job.findOne.mockResolvedValue(null);

        await syncJobs(mockIo);

        expect(Job.prototype.save).toHaveBeenCalledTimes(1);
        expect(mockIo.emit).toHaveBeenCalledWith('new_jobs', expect.any(Object));
    });

    test('Crypto utility generates consistent hash', () => {
        const hash1 = generateJobHash('Software Engineer', 'Company Inc', 'http://link.com');
        const hash2 = generateJobHash('software engineer ', ' company inc', 'HTTP://LINK.COM ');

        expect(hash1).toBe(hash2); // Whitespace and case shouldn't affect hash
    });
});
