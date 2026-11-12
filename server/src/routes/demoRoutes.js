import { Router } from 'express';

const router = Router();

// GET /api/slow - Non-blocking 3-second delay using setTimeout inside a Promise
router.get('/slow', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  res.status(200).json({
    success: true,
    message: 'Finished 3-second non-blocking delay',
  });
});

// GET /api/block - 3-second synchronous CPU busy loop (blocks Node.js event loop)
router.get('/block', (req, res) => {
  const start = Date.now();
  while (Date.now() < start + 3000) {
    // synchronous CPU busy loop
  }

  res.status(200).json({
    success: true,
    message: 'Finished 3-second blocking loop',
  });
});

export default router;
