const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    skills: {
        type: [String],
        default: []
    },
    salaryRange: {
        type: String,
        default: 'Not specified'
    },
    experienceLevel: {
        type: String,
        enum: ['Entry level', 'Mid-Senior level', 'Director', 'Executive', 'Internship', 'Not specified'],
        default: 'Not specified'
    },
    jobType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Volunteer', 'Internship', 'Not specified'],
        default: 'Not specified'
    },
    workplaceType: {
        type: String,
        enum: ['Remote', 'Hybrid', 'On-site', 'Not specified'],
        default: 'Not specified'
    },
    jobUrl: {
        type: String,
        required: true,
        unique: true
    },
    source: {
        type: String,
        enum: ['LinkedIn', 'Naukri', 'Indeed', 'Other'],
        default: 'Other'
    },
    postedDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Active', 'Closed'],
        default: 'Active'
    },
    hash: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true });

// Hash index for fast deduplication checking
JobSchema.index({ hash: 1 });
// Compound index for filtering
JobSchema.index({ role: 1, location: 1, postedDate: -1 });

module.exports = mongoose.model('Job', JobSchema);
