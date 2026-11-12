import { Router } from 'express';
import mongoose from 'mongoose';
import Application from '../models/Application.js';
import { ApiError } from '../errors/ApiError.js';
import { validateApplication, validatePatchApplication } from '../middleware/validate.js';

const router = Router();

/**
 * Helper to catch unhandled async errors and pass them to next().
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// -----------------------------------------------------------------------------
// 1. GET /stats
// IMPORTANT: Mounted BEFORE /:id so 'stats' is not evaluated as an ObjectId.
// -----------------------------------------------------------------------------
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const matchStage = {};

    if (req.query.owner) {
      if (!mongoose.Types.ObjectId.isValid(req.query.owner)) {
        throw new ApiError(400, 'Invalid owner ID format');
      }
      matchStage.owner = new mongoose.Types.ObjectId(req.query.owner);
    }

    // Aggregation pipeline: $match (optional), $group by status with $sum: 1, $sort
    const statusPipeline = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ];

    const statusCounts = await Application.aggregate(statusPipeline);

    // Calculate average salary of 'Offer' applications ($avg: '$salary')
    const offerPipeline = [
      {
        $match: {
          ...matchStage,
          status: 'Offer',
          salary: { $exists: true, $ne: null, $gte: 0 },
        },
      },
      {
        $group: {
          _id: null,
          avgSalary: { $avg: '$salary' },
        },
      },
    ];

    const offerResult = await Application.aggregate(offerPipeline);
    const averageOfferSalary = offerResult.length > 0 ? offerResult[0].avgSalary : 0;

    // Structured counts map
    const counts = {
      Applied: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
    };

    statusCounts.forEach((item) => {
      if (item._id && counts[item._id] !== undefined) {
        counts[item._id] = item.count;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        counts,
        byStatus: statusCounts,
        averageOfferSalary,
      },
    });
  })
);

// -----------------------------------------------------------------------------
// 2. GET / - List applications with filtering, search regex, and pagination
// -----------------------------------------------------------------------------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const queryFilter = {};

    // Filter by status if provided (and not 'All')
    if (req.query.status && req.query.status !== 'All') {
      queryFilter.status = req.query.status;
    }

    // Search filter: case-insensitive regex on company or role
    if (req.query.search && req.query.search.trim() !== '') {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      queryFilter.$or = [{ company: searchRegex }, { role: searchRegex }];
    }

    // Filter by owner if provided
    if (req.query.owner) {
      if (mongoose.Types.ObjectId.isValid(req.query.owner)) {
        queryFilter.owner = req.query.owner;
      }
    }

    const total = await Application.countDocuments(queryFilter);
    const totalPages = Math.ceil(total / limit) || 1;

    const applications = await Application.find(queryFilter)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      page,
      totalPages,
      data: applications,
    });
  })
);

// -----------------------------------------------------------------------------
// 3. POST / - Create a new application with duplicate check per owner
// -----------------------------------------------------------------------------
router.post(
  '/',
  validateApplication,
  asyncHandler(async (req, res) => {
    const { owner, company, role, status, appliedOn, priority, salary, notes } = req.body;

    // Check duplicate company + role per owner (case-insensitive)
    const duplicate = await Application.findOne({
      owner,
      company: new RegExp(`^${company.trim()}$`, 'i'),
      role: new RegExp(`^${role.trim()}$`, 'i'),
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: {
          duplicate: 'An application for this company and role already exists for this owner',
          company: 'An application for this company and role already exists for this owner',
        },
      });
    }

    const application = await Application.create({
      owner,
      company: company.trim(),
      role: role.trim(),
      ...(status !== undefined && { status }),
      ...(appliedOn !== undefined && { appliedOn }),
      ...(priority !== undefined && { priority }),
      ...(salary !== undefined && { salary }),
      ...(notes !== undefined && { notes }),
    });

    await application.populate('owner', 'name email');

    res.status(201).json({
      success: true,
      data: application,
    });
  })
);

// -----------------------------------------------------------------------------
// 4. GET /:id - Retrieve single application populated with owner
// -----------------------------------------------------------------------------
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id).populate('owner', 'name email');

    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  })
);

// -----------------------------------------------------------------------------
// 5. PATCH /:id - Partial update with validation and populated owner
// -----------------------------------------------------------------------------
router.patch(
  '/:id',
  validatePatchApplication,
  asyncHandler(async (req, res) => {
    const updated = await Application.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('owner', 'name email');

    if (!updated) {
      throw new ApiError(404, 'Application not found');
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  })
);

// -----------------------------------------------------------------------------
// 6. DELETE /:id - Delete an application by ID
// -----------------------------------------------------------------------------
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deleted = await Application.findByIdAndDelete(req.params.id);

    if (!deleted) {
      throw new ApiError(404, 'Application not found');
    }

    res.status(204).send();
  })
);

// -----------------------------------------------------------------------------
// 7. POST /:id/notes - Add a note to an existing application
// -----------------------------------------------------------------------------
router.post(
  '/:id/notes',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { text } = req.body || {};

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: { text: 'Note text cannot be empty' },
      });
    }

    const application = await Application.findById(id);

    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    application.notes.push({ text: text.trim() });
    await application.save();
    await application.populate('owner', 'name email');

    res.status(201).json({
      success: true,
      data: application,
    });
  })
);

export default router;
