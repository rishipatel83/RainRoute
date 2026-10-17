// src/routes/feedbackRoutes.js
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authAdmin = require('../middleware/authAdmin');

router.post('/', feedbackController.submitFeedback);
router.get('/', authAdmin, feedbackController.getAllFeedback);

module.exports = router;
