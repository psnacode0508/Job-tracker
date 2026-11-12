import { Router } from 'express';
import User from '../models/User.js';
import Application from '../models/Application.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Protect all admin routes with authentication and admin authorization
router.use(protect);
router.use(authorize('admin'));

/**
 * GET /stats
 * Global analytics across all users:
 * - totalUsers
 * - totalApplications
 * - statusBreakdown ($group by status)
 * - averageOfferSalary
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    // 1. Total users count
    const totalUsers = await User.countDocuments();

    // 2. Total applications count
    const totalApplications = await Application.countDocuments();

    // 3. Status breakdown across all applications
    const statusBreakdown = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // 4. Average offer salary
    const offerPipeline = [
      {
        $match: {
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

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalApplications,
        statusBreakdown,
        averageOfferSalary,
      },
    });
  })
);

export default router;
