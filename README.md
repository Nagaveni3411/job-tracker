# SaaS Job Notification Tracker

A production-ready SaaS application for tracking job notifications, featuring a premium LinkedIn-inspired UI, robust backend architecture with real-time updates via WebSockets, and comprehensive job filtering. 

## Features

- **Live Data Scraping**: Robust scraping service targeting LinkedIn (with fallback support for Naukri & Indeed algorithms simulation).
- **Graceful Fallbacks**: Simulates rate-limiting recovery and mocked data for zero-downtime demonstration.
- **Smart Deduplication**: Avoids duplicate entries by using SHA-256 hash combination of Job Title, Company, and URL.
- **Real-Time Updates**: Notifies the users via WebSocket regarding new job postings without manual browser reload.
- **Advanced Job Filtering**: Filter jobs by Role, Location, Experience Level, Job Type, and Freshness.
- **Premium User Experience**: Designed with modern visual principles, skeleton loaders, and professional typography.
- **Clean Architecture**: Modular NodeJS backend with separate `controllers`, `services`, `routes`, and `models`.

## Tech Stack

### Frontend
- **React 19** with **Vite**
- **Axios** and **Socket.io-client**
- **Lucide-react** for UI iconography
- Custom **Vanilla CSS** conforming to an elegant and robust CSS var-based design system

### Backend
- **Node.js** & **Express**
- **MongoDB** & **Mongoose** for data storage
- **Cheerio** & **Axios** for data scraping
- **Node-cron** for scheduling automated syncing
- **Winston** for robust logging logic
- **Jest** & **Supertest** for comprehensive automated testing

## Project Setup

### Prerequisites

Ensure you have the following installed:
- Node.js (>= 18)
- MongoDB running locally or a valid `MONGO_URI`.

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory (by default, one is provided configuring port 5000 and the MongoDB local URL):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/saas-job-tracker
NODE_ENV=development
```

Start the backend application:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

### 2. Frontend Setup

In a new terminal, navigate to the frontend folder:

```bash
cd frontend
npm install
```

Start the React development server:
```bash
npm run dev
```

Build for Production:
```bash
npm run build
```

## How It Works

1. **Scraping**: `linkedinScraper` hits LinkedIn. If LinkedIn rate limits (due to public access limits), it smoothly falls back onto a deterministic list of `generateMockJobs`, ensuring there is always fresh displayable data for production simulations.
2. **Sync Jobs**: `node-cron` orchestrates a task to run `syncJobs` at midnight daily (simulated when running tests/demo server), calling scrapers and checking DB records using `cryptoUtils.generateJobHash`.
3. **Filtering**: The `GET /api/jobs` REST layer utilizes dynamic `$match` MongoDB structures efficiently indexed for text matching and attribute checks.
4. **Live Feed**: After a successful sync, the `syncJobs` service triggers a websocket `io.emit('new_jobs', data)` and the frontend consumes it to display a notification pill prompting live update refreshes.

## Testing Setup Details

The API ships with two fundamental test suites running via `jest`:
- `backend/tests/api.test.js`: Checks the Express REST endpoints explicitly verifying schema payloads and integration with the DB mocking layer.
- `backend/tests/scraper.test.js`: Verifies deduplication hashing consistency, graceful error and API fallback handling to ensure robust data extraction.
