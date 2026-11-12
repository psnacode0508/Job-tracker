import mongoose from 'mongoose';

const ALLOWED_STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];
const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High'];
const ALLOWED_PATCH_FIELDS = ['company', 'role', 'status', 'appliedOn', 'priority', 'salary', 'owner'];

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
 * Middleware to validate POST /api/applications requests.
 * Requires: owner (valid ObjectId), company (2-60), role (2-60).
 * Optional: salary (>= 0), appliedOn (not future), status, priority.
 */
export const validateApplication = (req, res, next) => {
  const errors = {};
  const { owner, company, role, status, appliedOn, priority, salary } = req.body || {};

  // Owner: required, valid ObjectId
  if (!owner) {
    errors.owner = 'Owner is required';
  } else if (!mongoose.Types.ObjectId.isValid(owner)) {
    errors.owner = 'Owner must be a valid ObjectId';
  }

  // Company: required, 2-60 chars
  if (!company || typeof company !== 'string' || company.trim().length < 2 || company.trim().length > 60) {
    errors.company = 'Company is required and must be between 2 and 60 characters';
  }

  // Role: required, 2-60 chars
  if (!role || typeof role !== 'string' || role.trim().length < 2 || role.trim().length > 60) {
    errors.role = 'Role is required and must be between 2 and 60 characters';
  }

  // Status: optional, must be one of ['Applied', 'Interview', 'Offer', 'Rejected'] if provided
  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      errors.status = `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`;
    }
  }

  // Priority: optional, must be one of ['Low', 'Medium', 'High'] if provided
  if (priority !== undefined) {
    if (!ALLOWED_PRIORITIES.includes(priority)) {
      errors.priority = `Priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}`;
    }
  }

  // AppliedOn: optional, valid date and not in the future if provided
  if (appliedOn !== undefined) {
    if (!isValidDate(appliedOn)) {
      errors.appliedOn = 'appliedOn must be a valid date';
    } else if (isFutureDate(appliedOn)) {
      errors.appliedOn = 'appliedOn cannot be in the future';
    }
  }

  // Salary: optional, non-negative number if provided
  if (salary !== undefined && salary !== null) {
    if (typeof salary !== 'number' || isNaN(salary) || salary < 0) {
      errors.salary = 'Salary must be a non-negative number';
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
 * Middleware to validate PATCH /api/applications/:id requests.
 * Only allows updating known fields: company, role, status, appliedOn, priority, salary, owner.
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
    if (!ALLOWED_PATCH_FIELDS.includes(key)) {
      errors[key] = `Field '${key}' is not allowed for update`;
    }
  }

  // Validate owner if present
  if (body.owner !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(body.owner)) {
      errors.owner = 'Owner must be a valid ObjectId';
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

  // Validate salary if present
  if (body.salary !== undefined && body.salary !== null) {
    if (typeof body.salary !== 'number' || isNaN(body.salary) || body.salary < 0) {
      errors.salary = 'Salary must be a non-negative number';
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
