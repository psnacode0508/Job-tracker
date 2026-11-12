import { Router } from 'express';
import { validateApplication, validatePatchApplication } from '../middleware/validate.js';
import { ApiError } from '../errors/ApiError.js';
import {
  filterApplications,
  findById,
  create,
  update,
  deleteApp,
} from '../data/applications.js';

const router = Router();

// GET /api/applications - Get all applications with optional ?status=&search= filters
router.get('/', (req, res) => {
  const { status, search } = req.query;
  const data = filterApplications({ status, search });

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
});

// GET /api/applications/:id - Get a single application by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const app = findById(id);

  if (!app) {
    throw new ApiError(404, 'Application not found');
  }

  res.status(200).json({
    success: true,
    data: app,
  });
});

// POST /api/applications - Create a new application
router.post('/', validateApplication, (req, res) => {
  const newApp = create(req.body);

  res.status(201).json({
    success: true,
    data: newApp,
  });
});

// PATCH /api/applications/:id - Update an application
router.patch('/:id', validatePatchApplication, (req, res) => {
  const { id } = req.params;
  const updated = update(id, req.body);

  if (!updated) {
    throw new ApiError(404, 'Application not found');
  }

  res.status(200).json({
    success: true,
    data: updated,
  });
});

// DELETE /api/applications/:id - Delete an application
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = deleteApp(id);

  if (!deleted) {
    throw new ApiError(404, 'Application not found');
  }

  res.status(204).send();
});

export default router;
