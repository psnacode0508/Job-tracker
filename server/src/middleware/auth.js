import jwt from 'jsonwebtoken';
import ApiError from '../errors/ApiError.js';
import User from '../models/User.js';

/**
 * Protect middleware:
 * Extracts Bearer token from req.headers.authorization,
 * verifies with JWT_SECRET, and attaches authenticated user to req.user.
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Not authorised');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throw new ApiError(401, 'Not authorised');
    }

    const userId = decoded?.id || decoded?._id;
    if (!userId) {
      throw new ApiError(401, 'Not authorised');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(401, 'Not authorised');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize middleware:
 * Restricts access to specific roles.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: insufficient permissions'));
    }
    next();
  };
};

export default {
  protect,
  authorize,
};
