require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cron = require('node-cron');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const logger = require('./config/logger');
const jobRoutes = require('./routes/jobs');
const { syncJobs } = require('./services/scraperService');

let isMongoConnected = false;

// Connect to database securely without crashing server
connectDB().then(status => {
    isMongoConnected = status;
});

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));

app.use(express.json());

// Routes
app.use('/api/jobs', jobRoutes);

// Socket.io for live updates
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});

// Run scraper daily at midnight, or more frequently for demo
// 0 0 * * * = daily at midnight
cron.schedule('0 0 * * *', async () => {
    logger.info('Running scheduled job sync...');
    await syncJobs(io);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

    // Initial sync on startup (demo purpose)
    try {
        if (!isMongoConnected) {
            logger.warn('Skipping initial MongoDB population because no DB instance is active.');
        } else {
            const Job = require('./models/Job');
            const jobCount = await Job.countDocuments();
            if (jobCount < 50) {
                logger.info('Initial DB population...');
                await syncJobs(io);
            }
        }
    } catch (error) {
        logger.error(`Initial populate failed: ${error}`);
    }
});

module.exports = { app, server };
