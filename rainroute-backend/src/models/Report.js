// src/models/Report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: [true, 'Latitude is required'],
    min: [-90, 'Latitude must be between -90 and 90'],
    max: [90, 'Latitude must be between -90 and 90'],
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required'],
    min: [-180, 'Longitude must be between -180 and 180'],
    max: [180, 'Longitude must be between -180 and 180'],
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // TTL Index: Automatically expires 6 hours (21600 seconds) after creation
    expires: 21600,
  },
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
