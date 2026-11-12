import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  summarizeJob,
  rewriteBullet,
  extractJobDetails,
  getAiUsage,
} from '../controllers/aiController.js';

const router = Router();

// Protect all AI routes: valid JWT authentication required
router.use(protect);

// POST /api/ai/summarize - Summarize job description into 5 bullet points
router.post('/summarize', summarizeJob);

// POST /api/ai/rewrite - Rewrite resume bullet point in specific tone (< 30 words)
router.post('/rewrite', rewriteBullet);

// POST /api/ai/extract - Extract structured job data (JSON) with automatic retry
router.post('/extract', extractJobDetails);

// GET /api/ai/usage - Get authenticated user's AI metrics and spend for today (UTC)
router.get('/usage', getAiUsage);

export default router;
