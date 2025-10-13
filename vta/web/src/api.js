// Client-side API helper functions for the Video Transcoding App

/**
 * Get a presigned S3 upload URL for direct upload.
 * @param {string} idToken - Cognito ID token (JWT)
 * @param {string} filename - Name of the file to upload
 * @param {string} contentType - MIME type of the file
 */
export async function getPresign(idToken, filename, contentType) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/uploads/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ filename, contentType })
  });

  if (!res.ok) throw new Error('Failed to get presigned URL');
  return res.json(); // { url, key }
}

/**
 * Create a new transcoding job.
 * @param {string} idToken - Cognito ID token
 * @param {string} inputKey - S3 key of uploaded video
 * @param {string[]} outputs - Array of formats to transcode to
 */
export async function createJob(idToken, inputKey, outputs) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ inputKey, outputs })
  });

  if (!res.ok) throw new Error('Failed to create job');
  return res.json(); // { jobId, status, outputs }
}

/**
 * Get details and status for a specific job.
 * @param {string} idToken - Cognito ID token
 * @param {string} jobId - Job ID to fetch
 */
export async function getJob(idToken, jobId) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${idToken}` }
  });

  if (!res.ok) throw new Error('Failed to fetch job status');
  return res.json(); // { jobId, status, outputs, ... }
}

/**
 * List all video jobs belonging to the user.
 * @param {string} idToken - Cognito ID token
 */
export async function listVideos(idToken) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/videos`, {
    headers: { Authorization: `Bearer ${idToken}` }
  });

  if (!res.ok) throw new Error('Failed to fetch videos');
  return res.json(); // Array of video job objects
}
