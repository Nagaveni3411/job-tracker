const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
        logger.info(`MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        logger.warn('WARNING: MongoDB is not running locally. Engaging mock-mode array storage to keep the preview UI alive and functional!');
        return false; // Returns false to tell index.js to use mock controllers
    }
};

module.exports = connectDB;
