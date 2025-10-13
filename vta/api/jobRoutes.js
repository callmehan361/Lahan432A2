/* //wuvrowvnwovnw3onrve3owvn3we

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
 */ //wuvrowvnwovnw3onrve3owvn3we

 /*
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
 */ //wuvrowvnwovnw3onrve3owvn3we

 /*
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

*/ //wuvrowvnwovnw3onrve3owvn3we


// vta/api/jobRoutes.js
// Handles creation, listing, and retrieval of video transcoding jobs

import express from "express";
import { v4 as uuid } from "uuid";
import { putItem, getItem, queryByUser } from "../libs/ddb.js";
import { enqueueJob } from "../libs/sqs.js";
import { verifyJwt } from "./middleware/verifyJwt.js";

const router = express.Router();

/**
 * POST /jobs
 * Create a new transcoding job
 */
router.post("/", verifyJwt, async (req, res) => {
  try {
    const { inputKey, targetFormat } = req.body;

    if (!inputKey || !targetFormat) {
      return res.status(400).json({ message: "Missing inputKey or targetFormat" });
    }

    const jobId = uuid();
    const now = Date.now();
    const userSub = req.user.sub;

    const outputKey = `${process.env.S3_OUTPUT_PREFIX}${jobId}.${targetFormat}`;

    const item = {
      id: jobId,             // DynamoDB primary key
      jobId,                 // API-friendly
      userSub,               // Cognito user reference
      inputKey,
      targetFormat,
      outputKey,
      status: "QUEUED",
      createdAt: now,
      updatedAt: now,
    };

    // Save to DynamoDB
    await putItem(item);

    // Send message to SQS for worker
    await enqueueJob({ jobId, inputKey, targetFormat });

    console.log(`✅ Job ${jobId} queued for ${targetFormat} conversion`);
    res.json({
      jobId,
      status: "QUEUED",
      targetFormat,
      outputKey,
    });
  } catch (err) {
    console.error("❌ Error creating job:", err);
    res.status(500).json({ message: "Failed to create job", error: err.message });
  }
});

/**
 * GET /jobs
 * List all jobs for the authenticated user
 */
router.get("/", verifyJwt, async (req, res) => {
  try {
    const userSub = req.user.sub;
    const jobs = await queryByUser(userSub); // returns Items[] directly

    res.json({
      count: jobs.length,
      jobs,
    });
  } catch (err) {
    console.error("❌ Error listing jobs:", err);
    res.status(500).json({ message: "Failed to list jobs", error: err.message });
  }
});

/**
 * GET /jobs/:jobId
 * Get details for a single job
 */
router.get("/:jobId", verifyJwt, async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ message: "Missing jobId" });

    const job = await getItem(jobId); // ✅ directly get the job object

    if (!job) {
      console.warn(`⚠️ No job found for ID ${jobId}`);
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.userSub !== req.user.sub) {
      console.warn(`🚫 Access denied: user ${req.user.sub} tried to access ${jobId}`);
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(job);
  } catch (err) {
    console.error("❌ Error fetching job:", err);
    res.status(500).json({ message: "Failed to fetch job", error: err.message });
  }
});

export default router;
