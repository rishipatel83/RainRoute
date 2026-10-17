// src/controllers/reportController.js
const reportService = require('../services/reportService');

/**
 * @desc    Submit a new waterlog report
 * @route   POST /api/reports
 */
exports.createReport = async (req, res, next) => {
  try {
    const { latitude, longitude, imageUrl } = req.body;

    // Strict input validation
    if (latitude === undefined || longitude === undefined || !imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: latitude, longitude, and imageUrl are all required.',
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates provided.',
      });
    }

    const newReport = await reportService.createReport(lat, lng, imageUrl);

    console.log(`📍 [Report Created] ID: ${newReport._id} at (${lat}, ${lng})`);

    // Maintain exact backward compatibility with mobile frontend
    return res.status(201).json({
      message: 'Report saved',
      report: newReport,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all active waterlog reports
 * @route   GET /api/reports
 */
exports.getActiveReports = async (req, res, next) => {
  try {
    const reports = await reportService.getActiveReports();

    // Maintain exact array response for React Native map rendering
    return res.status(200).json(reports);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Health check & stats endpoint
 * @route   GET /api/reports/stats
 */
exports.getStats = async (req, res, next) => {
  try {
    const count = await reportService.getActiveCount();
    return res.status(200).json({
      success: true,
      activeReportsCount: count,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
