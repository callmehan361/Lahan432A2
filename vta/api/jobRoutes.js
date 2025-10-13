// Handles creation, listing, and retrieval of video transcoding jobs

import express from "express";
import { v4 as uuid } from "uuid";
import { putItem, getItem, queryByUser } from "../libs/ddb.js";
import { enqueueJob } from "../libs/sqs.js";
import { verifyJwt } from "./middleware/verifyJwt.js";
import { presignDownload } from "../libs/s3.js"; // add this near top if not imported already

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

    console.log(` Job ${jobId} queued for ${targetFormat} conversion`);
    res.json({
      jobId,
      status: "QUEUED",
      targetFormat,
      outputKey,
    });
  } catch (err) {
    console.error(" Error creating job:", err);
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
    console.error(" Error listing jobs:", err);
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

    const job = await getItem(jobId); // directly get the job object

    if (!job) {
      console.warn(` No job found for ID ${jobId}`);
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.userSub !== req.user.sub) {
      console.warn(` Access denied: user ${req.user.sub} tried to access ${jobId}`);
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(job);
  } catch (err) {
    console.error(" Error fetching job:", err);
    res.status(500).json({ message: "Failed to fetch job", error: err.message });
  }
});


/**
 * GET /jobs/:jobId/download
 * Generates a temporary download link for the output video
 */
router.get("/:jobId/download", verifyJwt, async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ message: "Missing jobId" });

    const job = await getItem(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.userSub !== req.user.sub)
      return res.status(403).json({ message: "Access denied" });
    if (job.status !== "COMPLETED")
      return res.status(400).json({ message: "Job not completed yet" });

    // Generate pre-signed download URL
    const { url } = await presignDownload(job.outputKey);

    res.json({
      message: "Temporary download link generated",
      downloadUrl: url,
    });
  } catch (err) {
    console.error(" Error generating download link:", err);
    res.status(500).json({ message: "Failed to create download link", error: err.message });
  }
});

export default router;