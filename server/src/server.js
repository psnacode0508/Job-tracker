import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import connectDB from './config/db.js';
import { logger } from './middleware/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import demoRoutes from './routes/demoRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Helmet security headers middleware
app.use(helmet());

// Strip any trailing slash from CLIENT_URL so Vercel URLs never fail on trailing slash mismatches
const clientOrigin = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.replace(/\/+$/, '')
  : 'http://localhost:5173';

// 2. CORS middleware
app.use(
  cors({
    origin: clientOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// 3. Body parser middleware
app.use(express.json());

// 4. Request logger middleware
app.use(logger);

// 5. Public health check route (before protected routes)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', demoRoutes);

// 6. 404 handler for unmatched routes
app.use(notFoundHandler);

// 7. Central error handler
// If errorHandler is registered before routes, it will never intercept errors passed to next(err) because Express executes middleware in registration order; unmatched route requests would terminate or bypass central error formatting.
app.use(errorHandler);

// Connect to MongoDB before starting HTTP server
await connectDB();

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;
