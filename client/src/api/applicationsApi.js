import axiosClient from './axiosClient.js';

/**
 * Fetch paginated, filtered applications for the current authenticated user.
 * @param {Object} [params] - Query filters { status, search, page, limit }
 * @returns {Promise<Object>} API response data with applications list & metadata
 */
export const fetchApplications = async (params = {}) => {
  const response = await axiosClient.get('/applications', { params });
  return response.data;
};

/**
 * Fetch application statistics aggregated for the current authenticated user.
 * @returns {Promise<Object>} API response data with status counts & offer stats
 */
export const fetchApplicationStats = async () => {
  const response = await axiosClient.get('/applications/stats');
  return response.data;
};

/**
 * Create a new application card.
 * @param {Object} data - Application payload { company, role, status, priority, salary, appliedOn, notes }
 * @returns {Promise<Object>} API response data with created application
 */
export const createApplication = async (data) => {
  const response = await axiosClient.post('/applications', data);
  return response.data;
};

/**
 * Update an existing application card.
 * @param {string} id - Application ObjectId
 * @param {Object} data - Partial application update payload
 * @returns {Promise<Object>} API response data with updated application
 */
export const updateApplication = async (id, data) => {
  const response = await axiosClient.patch(`/applications/${id}`, data);
  return response.data;
};

/**
 * Delete an application card by ID.
 * @param {string} id - Application ObjectId
 * @returns {Promise<void>}
 */
export const deleteApplication = async (id) => {
  const response = await axiosClient.delete(`/applications/${id}`);
  return response.data;
};

/**
 * Add a note to an existing application.
 * @param {string} id - Application ObjectId
 * @param {string} text - Note content
 * @returns {Promise<Object>} API response data with updated application
 */
export const addApplicationNote = async (id, text) => {
  const response = await axiosClient.post(`/applications/${id}/notes`, { text });
  return response.data;
};

export default {
  fetchApplications,
  fetchApplicationStats,
  createApplication,
  updateApplication,
  deleteApplication,
  addApplicationNote,
};
