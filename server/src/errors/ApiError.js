export class ApiError extends Error {
  /**
   * Custom ApiError
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error description
   * @param {object} [errors={}] - Detailed validation or field errors
   */
  constructor(statusCode, message, errors = {}) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
