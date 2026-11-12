import { Router } from 'express';
import mongoose from 'mongoose';
import Application from '../models/Application.js';
import { ApiError } from '../errors/ApiError.js';
import { protect } from '../middleware/auth.js';
import { validateApplication, validatePatchApplication } from '../middleware/validate.js';

const router = Router();

/**
 * Helper to catch unhandled async errors and pass them to next().
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Protect ALL application routes - authenticated user required
router.use(protect);

// -----------------------------------------------------------------------------
// 1. GET /stats
// IMPORTANT: Mounted BEFORE /:id so 'stats' is not evaluated as an ObjectId.
// Strict ownership isolation: aggregated exclusively for req.user._id.
// -----------------------------------------------------------------------------
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const ownerId = new mongoose.Types.ObjectId(req.user._id);
    const matchStage = { owner: ownerId };

    // Aggregation pipeline: $match owner, $group by status with $sum: 1, $sort
    const statusPipeline = [
      { $match: matchStage },
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

    // Calculate average salary of user's 'Offer' applications ($avg: '$salary')
    const offerPipeline = [
      {
        $match: {
          owner: ownerId,
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
// 2. GET / - List current user's applications with filtering, search, and pagination
// -----------------------------------------------------------------------------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    // Strict ownership isolation: force owner to current authenticated user
    const queryFilter = {
      owner: req.user._id,
    };

    // Filter by status if provided (and not 'All')
    if (req.query.status && req.query.status !== 'All') {
      queryFilter.status = req.query.status;
    }

    // Search filter: case-insensitive regex on company or role
    if (req.query.search && req.query.search.trim() !== '') {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      queryFilter.$or = [{ company: searchRegex }, { role: searchRegex }];
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
// 3. POST / - Create a new application; owner automatically set from JWT
// -----------------------------------------------------------------------------
router.post(
  '/',
  validateApplication,
  asyncHandler(async (req, res) => {
    const owner = req.user._id;
    const { company, role, status, appliedOn, priority, salary, notes } = req.body;

    // Check duplicate company + role for this authenticated owner (case-insensitive)
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
// 4. GET /:id - Retrieve single application enforcing owner isolation
// -----------------------------------------------------------------------------
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(404, 'Application not found');
    }

    const application = await Application.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate('owner', 'name email');

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
// 5. PATCH /:id - Partial update enforcing owner isolation
// -----------------------------------------------------------------------------
router.patch(
  '/:id',
  validatePatchApplication,
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(404, 'Application not found');
    }

    const updates = { ...req.body };
    delete updates.owner; // Prevent tampering with ownership

    const updated = await Application.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    ).populate('owner', 'name email');

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
// 6. DELETE /:id - Delete an application enforcing owner isolation
// -----------------------------------------------------------------------------
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(404, 'Application not found');
    }

    const deleted = await Application.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!deleted) {
      throw new ApiError(404, 'Application not found');
    }

    res.status(204).send();
  })
);

// -----------------------------------------------------------------------------
// 7. POST /:id/notes - Add note enforcing owner isolation
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Application not found');
    }

    const application = await Application.findOne({
      _id: id,
      owner: req.user._id,
    });

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
