import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../errors/ApiError.js';
import { protect } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /register
 * Validates name, email, password; rejects non-string fields to prevent NoSQL injection.
 * Creates user, signs JWT, strips password, and returns 201 with token and user.
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body || {};
    const errors = {};

    // Explicitly reject non-string fields to prevent NoSQL injection objects like { '$ne': null }
    if (typeof name !== 'string') {
      errors.name = 'Name must be a valid string';
    } else if (name.trim().length < 2 || name.trim().length > 60) {
      errors.name = 'Name must be between 2 and 60 characters';
    }

    if (typeof email !== 'string') {
      errors.email = 'Email must be a valid string';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please provide a valid email address';
    }

    if (typeof password !== 'string') {
      errors.password = 'Password must be a valid string';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ApiError(409, 'Email already in use');
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      ...(role && ['user', 'admin'].includes(role) && { role }),
    });

    // Sign JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    // Strip password from returned user object
    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      token,
      user: userObj,
    });
  })
);

/**
 * POST /login
 * Applies rate limiter, checks string types, validates credentials with .select('+password'),
 * and signs JWT on success.
 */
router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};

    // Explicitly check typeof email === 'string' && typeof password === 'string'
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: {
          ...(typeof email !== 'string' && { email: 'Email must be a string' }),
          ...(typeof password !== 'string' && { password: 'Password must be a string' }),
        },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user with password explicitly included
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // Identical error message for non-existent user or invalid password
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  })
);

/**
 * GET /me
 * Protected by protect middleware. Returns authenticated user profile.
 */
router.get('/me', protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

export default router;
