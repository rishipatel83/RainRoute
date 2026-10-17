// src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Routes for /api/reports
router.route('/')
  .post(reportController.createReport)
  .get(reportController.getActiveReports);

router.route('/stats')
  .get(reportController.getStats);

module.exports = router;
