// src/controllers/authController.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rainroute_super_secure_jwt_secret_key_2026';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@rainroute.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * @desc    Admin login endpoint
 * @route   POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const identifier = (username || email || '').trim().toLowerCase();
    const isUserValid = (identifier === ADMIN_USER.toLowerCase() || identifier === ADMIN_EMAIL.toLowerCase());
    const isPassValid = (password === ADMIN_PASSWORD);

    if (!isUserValid || !isPassValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin credentials.',
      });
    }

    // Generate JWT token valid for 7 days
    const token = jwt.sign(
      {
        role: 'admin',
        username: ADMIN_USER,
        email: ADMIN_EMAIL,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Admin authentication successful',
      token,
      admin: {
        username: ADMIN_USER,
        email: ADMIN_EMAIL,
        role: 'admin',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify admin token
 * @route   GET /api/auth/verify
 */
exports.verifyToken = async (req, res) => {
  return res.status(200).json({
    success: true,
    valid: true,
    admin: req.admin,
  });
};
