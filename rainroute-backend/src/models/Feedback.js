// src/models/Feedback.js
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5,
  },
  category: {
    type: String,
    default: 'general',
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Feedback message is required'],
    trim: true,
  },
  contactEmail: {
    type: String,
    trim: true,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
