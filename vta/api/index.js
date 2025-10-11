// vta/api/index.js
// Main Express API entrypoint for the Video Transcoding App

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

// Import route modules
import authRoutes from './authRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import jobRoutes from './jobRoutes.js';
import videoRoutes from './videoRoutes.js';

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json({ limit: '50mb' })); // handle large video metadata payloads

// Health check route
// app.get('/health', (req, res) => res.json({ ok: true, message: 'API is healthy ' }));

// Route bindings
app.use('/auth', authRoutes);
app.use('/uploads', uploadRoutes);
app.use('/jobs', jobRoutes);
app.use('/videos', videoRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(' Uncaught error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(` API Server running on port ${port}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
});
