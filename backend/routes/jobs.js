const express = require('express');
const { getJobs, triggerScrape } = require('../controllers/jobController');

const router = express.Router();

// @route   GET /api/jobs
// @desc    Get all jobs
// @access  Public
router.route('/').get(getJobs);

// @route   POST /api/jobs/sync
// @desc    Manually trigger web scraping job
// @access  Public
router.route('/sync').post(triggerScrape);

module.exports = router;
