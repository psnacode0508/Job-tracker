import axiosClient from './axiosClient.js';

/**
 * Register a new user account.
 * @param {Object} data - { name, email, password }
 * @returns {Promise<Object>} API response data with user and token
 */
export const registerUser = async (data) => {
  const response = await axiosClient.post('/auth/register', data);
  return response.data;
};

/**
 * Log in an existing user.
 * @param {Object} data - { email, password }
 * @returns {Promise<Object>} API response data with user and token
 */
export const loginUser = async (data) => {
  const response = await axiosClient.post('/auth/login', data);
  return response.data;
};

/**
 * Retrieve current authenticated user profile.
 * @returns {Promise<Object>} API response data with user
 */
export const getMe = async () => {
  const response = await axiosClient.get('/auth/me');
  return response.data;
};

export default {
  registerUser,
  loginUser,
  getMe,
};
