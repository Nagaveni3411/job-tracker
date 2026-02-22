const request = require('supertest');
const { app } = require('../index');
const Job = require('../models/Job');

jest.mock('../models/Job');
jest.mock('../services/scraperService', () => ({ syncJobs: jest.fn() }));

describe('Jobs API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Job.countDocuments.mockResolvedValue(10);
        Job.find.mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ title: 'Software Engineer', location: 'Remote', status: 'Active' }])
        });
    });

    test('GET /api/jobs should return a list of active jobs', async () => {
        const res = await request(app).get('/api/jobs');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].title).toBe('Software Engineer');
    });

    test('GET /api/jobs with filters applied', async () => {
        const res = await request(app).get('/api/jobs?role=React&jobType=Full-time');

        // Checks that mongoose find was called correctly
        expect(Job.find).toHaveBeenCalledWith(expect.objectContaining({
            status: 'Active',
            jobType: 'Full-time',
            $or: [
                { title: { $regex: 'React', $options: 'i' } },
                { description: { $regex: 'React', $options: 'i' } }
            ]
        }));
        expect(res.statusCode).toBe(200);
    });
});
