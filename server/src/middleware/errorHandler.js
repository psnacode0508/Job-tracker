import { ApiError } from '../errors/ApiError.js';

/**
 * 404 handler for unmatched routes.
 * Throws ApiError(404, 'Route not found').
 */
export const notFoundHandler = (req, res, next) => {
  throw new ApiError(404, 'Route not found');
};

/**
 * Central error-handling middleware.
 * Returns JSON with status code (default 500).
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message,
    ...(Object.keys(err.errors || {}).length && { errors: err.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default {
  notFoundHandler,
  errorHandler,
};
