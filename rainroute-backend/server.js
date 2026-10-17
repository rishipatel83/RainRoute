// server.js - RainRoute Backend Entry Point
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const connectDB = require('./src/config/db');
const reportRoutes = require('./src/routes/reportRoutes');
const requestLogger = require('./src/middleware/logger');
const { notFoundHandler, globalErrorHandler } = require('./src/middleware/errorHandler');

const app = express();

// 1. Core Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Cross-Origin Resource Sharing for mobile client

// 2. Logging Middleware
app.use(requestLogger);

// 3. Health & Status Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'RainRoute Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 4. Mount Application Routes
app.use('/api/reports', reportRoutes);

// 5. Error Handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

// 6. Connect to Database and Start Server
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RainRoute Server running on port ${PORT} (0.0.0.0)`);
    console.log(`📡 Endpoints: POST/GET http://0.0.0.0:${PORT}/api/reports`);
  });
});