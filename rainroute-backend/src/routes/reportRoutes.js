// src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authAdmin = require('../middleware/authAdmin');

// Public routes for all users
router.route('/')
  .post(reportController.createReport)
  .get(reportController.getActiveReports);

router.route('/stats')
  .get(reportController.getStats);

// Protected Admin routes
router.get('/all', authAdmin, reportController.getAllReports);
router.patch('/:id/status', authAdmin, reportController.updateReportStatus);
router.delete('/:id', authAdmin, reportController.deleteReport);

module.exports = router;
