// src/services/reportService.js
const Report = require('../models/Report');

class ReportService {
  /**
   * Save a new hazard report to the database
   */
  async createReport({
    latitude,
    longitude,
    imageUrl,
    hazardType = 'waterlogging',
    title = 'Hazard Report',
    description = '',
    severity = 'medium',
  }) {
    const report = new Report({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      imageUrl: imageUrl.trim(),
      hazardType,
      title: title || `${hazardType.charAt(0).toUpperCase() + hazardType.slice(1)} Report`,
      description: (description || '').trim(),
      severity,
      status: 'active',
    });
    return await report.save();
  }

  /**
   * Fetch all active, non-resolved hazard reports
   */
  async getActiveReports() {
    return await Report.find({ status: { $ne: 'resolved' } }).sort({ createdAt: -1 });
  }

  /**
   * Fetch all hazard reports including resolved (Admin only)
   */
  async getAllReports() {
    return await Report.find({}).sort({ createdAt: -1 });
  }

  /**
   * Update report status (e.g. mark resolved when fixed)
   */
  async updateReportStatus(id, status, adminIdentifier = 'admin') {
    const updateData = { status };
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = adminIdentifier;
    } else {
      updateData.resolvedAt = null;
      updateData.resolvedBy = null;
    }

    return await Report.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Permanently delete a report by ID (Admin only)
   */
  async deleteReport(id) {
    return await Report.findByIdAndDelete(id);
  }

  /**
   * Count total active hazard reports
   */
  async getActiveCount() {
    return await Report.countDocuments({ status: { $ne: 'resolved' } });
  }
}

module.exports = new ReportService();
