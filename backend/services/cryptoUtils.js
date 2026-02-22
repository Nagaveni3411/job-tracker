const crypto = require('crypto');

exports.generateJobHash = (title, company, jobUrl) => {
    return crypto.createHash('sha256').update(`${title.toLowerCase().trim()}|${company.toLowerCase().trim()}|${jobUrl.toLowerCase().trim()}`).digest('hex');
};
