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
 * Handles ApiError, Mongoose CastError, ValidationError, MongoServerError (11000),
 * and standard server errors.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors;

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    errors = { id: 'Invalid ObjectId' };
  }
  // Handle Mongoose ValidationError
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = {};
    if (err.errors) {
      Object.keys(err.errors).forEach((field) => {
        errors[field] = err.errors[field].message;
      });
    }
  }
  // Handle MongoServerError code 11000 (duplicate key)
  else if (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) {
    statusCode = 400;
    message = 'Duplicate field value entered';
    errors = undefined;
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && Object.keys(errors).length > 0 && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default {
  notFoundHandler,
  errorHandler,
};
