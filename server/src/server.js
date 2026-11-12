import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { logger } from './middleware/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import applicationRoutes from './routes/applicationRoutes.js';
import demoRoutes from './routes/demoRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. CORS middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}));

// 2. Body parser middleware
app.use(express.json());

// 3. Request logger middleware
app.use(logger);

// 4. Application and demo routes
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'JobTrackr API is active',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/applications', applicationRoutes);
app.use('/api', demoRoutes);

// 5. 404 handler for unmatched routes
app.use(notFoundHandler);

// 6. Central error handler
// If errorHandler is registered before routes, it will never intercept errors passed to next(err) because Express executes middleware in registration order; unmatched route requests would terminate or bypass central error formatting.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;
