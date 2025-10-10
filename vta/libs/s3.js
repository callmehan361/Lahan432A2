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
 */
export async function presignUpload(key, contentType) {
  try {
    const command = new PutObjectCommand({
      Bucket,
      Key: key,
      ContentType: contentType
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
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
 */
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
