/* // parameter integration

// vta/libs/s3.js
// Handles AWS S3 operations for video uploads and outputs

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import { REGION } from './aws.js';

dotenv.config();

const s3 = new S3Client({ region: REGION });
const Bucket = process.env.S3_BUCKET;

/**
 * Generate a pre-signed URL for direct client uploads to S3.
 * @param {string} key - S3 object key (path in bucket)
 * @param {string} contentType - MIME type (e.g. video/mp4)
 * @returns {Promise<{url: string, key: string}>}
 */ //sbvoqasbv

/* // parameter integration
export async function presignUpload(key, contentType) {
  try {
    const command = new PutObjectCommand({
      Bucket,
      Key: key,
      ContentType: contentType
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 1800 }); // 30 minutes
    return { url, key };
  } catch (err) {
    console.error('Error generating S3 presigned URL:', err);
    throw err;
  }
}

/**
 * Get an object from S3 (used by the worker for downloading source videos).
 * @param {string} key - S3 key to fetch
 * @returns {Promise<GetObjectCommandOutput>}
 */ //sbvoqasbv

 /* // parameter integration
export async function getObject(key) {
  try {
    const command = new GetObjectCommand({ Bucket, Key: key });
    const response = await s3.send(command);
    return response;
  } catch (err) {
    console.error('Error fetching S3 object:', err);
    throw err;
  }
}

export { s3, Bucket, GetObjectCommand };

*/ // parameter integration


// vta/libs/s3.js
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { REGION } from "./aws.js";

// Initialize AWS clients
const s3 = new S3Client({ region: REGION });
const ssm = new SSMClient({ region: REGION });

// Helper to fetch parameter value from Parameter Store
async function getParameter(name) {
  const param = await ssm.send(new GetParameterCommand({ Name: name }));
  return param.Parameter.Value;
}

//  Fetch all required parameters at startup
let Bucket, S3_UPLOAD_PREFIX, S3_OUTPUT_PREFIX;
async function loadS3Params() {
  Bucket = await getParameter("/lahana2/s3bucket");
  S3_UPLOAD_PREFIX = await getParameter("/lahana2/s3upload");
  S3_OUTPUT_PREFIX = await getParameter("/lahana2/s3output");

  console.log(" S3 parameters loaded from Parameter Store:", {
    Bucket,
    S3_UPLOAD_PREFIX,
    S3_OUTPUT_PREFIX,
  });
}

// Call immediately when this module is imported
await loadS3Params();

// -------------------------------
// Generate Pre-signed URLs
// -------------------------------

// For uploads
export async function presignUpload(filename, contentType) {
  const key = `${S3_UPLOAD_PREFIX}${filename}`;
  const command = new PutObjectCommand({
    Bucket,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 1800 }); // 30 mins
  return { url, key };
}

// For downloads
export async function presignDownload(key) {
  const command = new GetObjectCommand({
    Bucket,
    Key: key,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 1800 }); // 30 mins
  return { url };
}

// Export shared values if needed by other modules
export { Bucket, S3_UPLOAD_PREFIX, S3_OUTPUT_PREFIX };



