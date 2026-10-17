// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authAdmin = require('../middleware/authAdmin');

router.post('/login', authController.login);
router.get('/verify', authAdmin, authController.verifyToken);

module.exports = router;
