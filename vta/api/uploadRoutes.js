// Provides a pre-signed S3 upload URL for direct client uploads

import express from 'express';
import { v4 as uuid } from 'uuid';
import { presignUpload } from '../libs/s3.js';
import { verifyJwt } from './middleware/verifyJwt.js';
import path from 'path';

const router = express.Router();

/**
 * POST /uploads/presign
 * Generates a pre-signed S3 URL for direct upload
 */
router.post('/presign', verifyJwt, async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ message: 'Missing filename or contentType' });
    }

    // Create unique S3 key
    
    const cleanName = path.basename(filename); // removes any 'uploads/' or folder parts
    const key = `${uuid()}-${cleanName}`;

    // Generate presigned PUT URL
    const { url } = await presignUpload(key, contentType);

    console.log(` Generated presigned URL for: ${key}`);
    res.json({ url, key });
  } catch (err) {
    console.error(' Error generating presigned URL:', err.message);
    res.status(500).json({ message: 'Failed to generate presigned URL', error: err.message });
  }
});

export default router;
