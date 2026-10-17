// src/services/reportService.js
const Report = require('../models/Report');

class ReportService {
  /**
   * Save a new flood report to the database
   */
  async createReport(latitude, longitude, imageUrl) {
    const report = new Report({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      imageUrl: imageUrl.trim(),
    });
    return await report.save();
  }

  /**
   * Fetch all active flood reports within the active TTL window
   */
  async getActiveReports() {
    return await Report.find({}).sort({ createdAt: -1 });
  }

  /**
   * Count total active flood reports
   */
  async getActiveCount() {
    return await Report.countDocuments({});
  }
}

module.exports = new ReportService();
