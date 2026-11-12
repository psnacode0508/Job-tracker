import crypto from 'crypto';

/**
 * In-memory applications preloaded with 3 records matching Day 03 schema.
 */
export let applications = [
  {
    id: '1',
    company: 'Acme Corp',
    role: 'Frontend Engineer',
    status: 'Applied',
    appliedOn: '2026-10-28',
    priority: 'High',
  },
  {
    id: '2',
    company: 'Bright Labs',
    role: 'Product Designer',
    status: 'Interview',
    appliedOn: '2026-10-15',
    priority: 'Medium',
  },
  {
    id: '3',
    company: 'Nova Systems',
    role: 'Full Stack Developer',
    status: 'Offer',
    appliedOn: '2026-09-30',
    priority: 'Low',
  },
];

/**
 * Filter applications by status and search text.
 * Search matches company or role (case-insensitive).
 *
 * @param {{ status?: string, search?: string }} filters
 * @returns {Array} Filtered applications
 */
export const filterApplications = ({ status, search } = {}) => {
  return applications.filter((app) => {
    if (status && status !== 'All' && app.status !== status) {
      return false;
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      const matchCompany = app.company?.toLowerCase().includes(q);
      const matchRole = app.role?.toLowerCase().includes(q);
      if (!matchCompany && !matchRole) {
        return false;
      }
    }

    return true;
  });
};

export const queryApplications = filterApplications;
export const filter = filterApplications;
export const query = filterApplications;
export const getApplications = filterApplications;

/**
 * Find application by ID.
 *
 * @param {string} id
 * @returns {object|null}
 */
export const findById = (id) => {
  return applications.find((app) => String(app.id) === String(id)) || null;
};

/**
 * Create a new application with a unique ID and add to memory store.
 *
 * @param {object} data
 * @returns {object} Created application
 */
export const create = (data) => {
  const newApp = {
    id: data.id || crypto.randomUUID(),
    company: data.company,
    role: data.role,
    status: data.status || 'Applied',
    appliedOn: data.appliedOn || new Date().toISOString().slice(0, 10),
    priority: data.priority || 'Medium',
    ...data,
  };

  if (!newApp.id) {
    newApp.id = crypto.randomUUID();
  }

  applications.push(newApp);
  return newApp;
};

/**
 * Update an existing application by ID.
 *
 * @param {string} id
 * @param {object} updates
 * @returns {object|null} Updated application or null if not found
 */
export const update = (id, updates) => {
  const index = applications.findIndex((app) => String(app.id) === String(id));
  if (index === -1) return null;

  applications[index] = {
    ...applications[index],
    ...updates,
    id: applications[index].id, // preserve existing id
  };

  return applications[index];
};

/**
 * Delete an application by ID.
 *
 * @param {string} id
 * @returns {boolean} True if deleted, false if not found
 */
export const deleteApp = (id) => {
  const index = applications.findIndex((app) => String(app.id) === String(id));
  if (index === -1) return false;

  applications.splice(index, 1);
  return true;
};

export const remove = deleteApp;

export default {
  applications,
  filterApplications,
  queryApplications,
  filter,
  query,
  getApplications,
  findById,
  create,
  update,
  deleteApp,
  remove,
};
