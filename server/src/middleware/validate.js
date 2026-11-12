import { applications } from '../data/applications.js';

const ALLOWED_STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];
const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High'];
const ALLOWED_FIELDS = ['company', 'role', 'status', 'appliedOn', 'priority'];

/**
 * Checks if a string or date value represents a valid date.
 */
function isValidDate(dateValue) {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  return !isNaN(d.getTime());
}

/**
 * Checks if a date is in the future.
 */
function isFutureDate(dateValue) {
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim())) {
    const todayStr = new Date().toISOString().slice(0, 10);
    return dateValue.trim() > todayStr;
  }
  const d = new Date(dateValue);
  return d.getTime() > Date.now();
}

/**
 * Middleware to validate POST /applications requests.
 */
export const validateApplication = (req, res, next) => {
  const errors = {};
  const { company, role, status, appliedOn, priority } = req.body || {};

  // Company: required, 2-60 chars
  if (!company || typeof company !== 'string' || company.trim().length < 2 || company.trim().length > 60) {
    errors.company = 'Company is required and must be between 2 and 60 characters';
  }

  // Role: required, 2-60 chars
  if (!role || typeof role !== 'string' || role.trim().length < 2 || role.trim().length > 60) {
    errors.role = 'Role is required and must be between 2 and 60 characters';
  }

  // Status: must be one of ['Applied', 'Interview', 'Offer', 'Rejected'] if provided
  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      errors.status = `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`;
    }
  }

  // Priority: must be one of ['Low', 'Medium', 'High'] if provided
  if (priority !== undefined) {
    if (!ALLOWED_PRIORITIES.includes(priority)) {
      errors.priority = `Priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}`;
    }
  }

  // AppliedOn: valid date and not in the future if provided
  if (appliedOn !== undefined) {
    if (!isValidDate(appliedOn)) {
      errors.appliedOn = 'appliedOn must be a valid date';
    } else if (isFutureDate(appliedOn)) {
      errors.appliedOn = 'appliedOn cannot be in the future';
    }
  }

  // Check duplicate company + role against in-memory array (case-insensitive)
  if (!errors.company && !errors.role && typeof company === 'string' && typeof role === 'string') {
    const list = req.app?.locals?.applications || applications || [];
    const isDuplicate = list.some(
      (app) =>
        app.company?.trim().toLowerCase() === company.trim().toLowerCase() &&
        app.role?.trim().toLowerCase() === role.trim().toLowerCase()
    );

    if (isDuplicate) {
      errors.company = 'An application for this company and role already exists';
      errors.duplicate = 'An application for this company and role already exists';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Middleware to validate PATCH /applications/:id requests.
 * Only allows updating known fields and validates only the fields present in req.body.
 */
export const validatePatchApplication = (req, res, next) => {
  const errors = {};
  const body = req.body || {};
  const bodyKeys = Object.keys(body);

  if (bodyKeys.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: { body: 'Request body cannot be empty' },
    });
  }

  // Ensure only known fields are allowed
  for (const key of bodyKeys) {
    if (!ALLOWED_FIELDS.includes(key)) {
      errors[key] = `Field '${key}' is not allowed for update`;
    }
  }

  // Validate company if present
  if (body.company !== undefined) {
    if (typeof body.company !== 'string' || body.company.trim().length < 2 || body.company.trim().length > 60) {
      errors.company = 'Company must be between 2 and 60 characters';
    }
  }

  // Validate role if present
  if (body.role !== undefined) {
    if (typeof body.role !== 'string' || body.role.trim().length < 2 || body.role.trim().length > 60) {
      errors.role = 'Role must be between 2 and 60 characters';
    }
  }

  // Validate status if present
  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      errors.status = `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`;
    }
  }

  // Validate priority if present
  if (body.priority !== undefined) {
    if (!ALLOWED_PRIORITIES.includes(body.priority)) {
      errors.priority = `Priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}`;
    }
  }

  // Validate appliedOn if present
  if (body.appliedOn !== undefined) {
    if (!isValidDate(body.appliedOn)) {
      errors.appliedOn = 'appliedOn must be a valid date';
    } else if (isFutureDate(body.appliedOn)) {
      errors.appliedOn = 'appliedOn cannot be in the future';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

export default {
  validateApplication,
  validatePatchApplication,
};
