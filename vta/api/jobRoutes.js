// vta/jobRoutes.js
// Handles creation and retrieval of video transcoding jobs

import express from 'express';
import { v4 as uuid } from 'uuid';
import { putItem, getItem } from '../libs/ddb.js';
import { enqueueJob } from '../libs/sqs.js';
import { verifyJwt } from './middleware/verifyJwt.js';

const router = express.Router();

/**
 * POST /jobs
 * Create a new video transcoding job
 */
router.post('/', verifyJwt, async (req, res) => {
  try {
    const { inputKey, outputs = ['mp4_720p'], title, description } = req.body;
    if (!inputKey) return res.status(400).json({ message: 'Missing inputKey' });

    const jobId = uuid();
    const now = Date.now();
    const userSub = req.user.sub;

    const outputItems = outputs.map(fmt => ({
      format: fmt,
      key: `${process.env.S3_OUTPUT_PREFIX}${jobId}-${fmt}.mp4`,
      status: 'QUEUED'
    }));

    const item = {
      jobId,
      userSub,
      inputKey,
      outputs: outputItems,
      status: 'QUEUED',
      title: title || 'Untitled',
      description: description || '',
      createdAt: now,
      updatedAt: now
    };

    // Store job metadata in DynamoDB
    await putItem(item);

    // Send job message to SQS for the worker
    await enqueueJob({ jobId, inputKey, outputs });

    console.log(` Job ${jobId} queued for processing`);
    res.json({ jobId, status: 'QUEUED', outputs: outputItems });
  } catch (err) {
    console.error(' Error creating job:', err.message);
    res.status(500).json({ message: 'Failed to create job', error: err.message });
  }
});

/**
 * GET /jobs/:jobId
 * Retrieve job details and current status
 */
router.get('/:jobId', verifyJwt, async (req, res) => {
  try {
    const jobId = req.params.jobId;
    if (!jobId) return res.status(400).json({ message: 'Missing jobId' });

    const result = await getItem(jobId);
    const job = result.Item;

    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.userSub !== req.user.sub) return res.status(403).json({ message: 'Access denied' });

    res.json(job);
  } catch (err) {
    console.error(' Error fetching job:', err.message);
    res.status(500).json({ message: 'Failed to fetch job', error: err.message });
  }
});

export default router;
