// src/controllers/reportController.js
const reportService = require('../services/reportService');

/**
 * @desc    Submit a new hazard report (Public - No authorization required)
 * @route   POST /api/reports
 */
exports.createReport = async (req, res, next) => {
  try {
    const { latitude, longitude, imageUrl, hazardType, title, description, severity } = req.body;

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
        error: 'Invalid coordinates provided. Latitude must be between -90 and 90, Longitude between -180 and 180.',
      });
    }

    const validHazardTypes = ['waterlogging', 'pothole', 'construction', 'obstacle', 'accident', 'other'];
    const chosenHazardType = validHazardTypes.includes(hazardType) ? hazardType : 'waterlogging';

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const chosenSeverity = validSeverities.includes(severity) ? severity : 'medium';

    const newReport = await reportService.createReport({
      latitude: lat,
      longitude: lng,
      imageUrl,
      hazardType: chosenHazardType,
      title: title || `${chosenHazardType.charAt(0).toUpperCase() + chosenHazardType.slice(1)} Hazard`,
      description: description || '',
      severity: chosenSeverity,
    });

    console.log(`📍 [Report Created] ID: ${newReport._id} Type: ${chosenHazardType} at (${lat}, ${lng})`);

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
 * @desc    Get all active hazard reports (Public - No authorization required)
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
 * @desc    Get all reports including resolved (Admin only)
 * @route   GET /api/reports/all
 */
exports.getAllReports = async (req, res, next) => {
  try {
    const reports = await reportService.getAllReports();
    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update report status / Mark as Resolved (Admin only)
 * @route   PATCH /api/reports/:id/status
 */
exports.updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'investigating', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be active, investigating, or resolved.',
      });
    }

    const adminUser = req.admin?.username || 'admin';
    const updated = await reportService.updateReportStatus(id, status, adminUser);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Report not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Report marked as ${status}`,
      report: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a report (Admin only)
 * @route   DELETE /api/reports/:id
 */
exports.deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await reportService.deleteReport(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Report not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Health check & stats endpoint (Public)
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
