// src/controllers/feedbackController.js
const Feedback = require('../models/Feedback');

/**
 * @desc    Submit feedback (Public)
 * @route   POST /api/feedback
 */
exports.submitFeedback = async (req, res, next) => {
  try {
    const { rating, category, message, contactEmail } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Feedback message cannot be empty.',
      });
    }

    const feedback = new Feedback({
      rating: Number(rating) || 5,
      category: category || 'general',
      message: message.trim(),
      contactEmail: (contactEmail || '').trim(),
    });

    await feedback.save();

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been received.',
      feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all feedback (Admin only)
 * @route   GET /api/feedback
 */
exports.getAllFeedback = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks,
    });
  } catch (error) {
    next(error);
  }
};
