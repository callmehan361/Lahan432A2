// vta/worker/index.js
// Worker that processes video transcoding jobs from SQS

import dotenv from 'dotenv';
dotenv.config();

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { PassThrough } from 'stream';
import { Upload } from '@aws-sdk/lib-storage';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { GetObjectCommand } from '@aws-sdk/client-s3';

import { REGION } from '../libs/aws.js';
import { s3, Bucket } from '../libs/s3.js';
import { updateItem } from '../libs/ddb.js';
import { QueueUrl } from '../libs/sqs.js';
import { setFfmpegPath } from '../libs/ffmpegPath.js';

// Set ffmpeg binary path (uses ffmpeg-static)
setFfmpegPath();

// Initialize SQS client
const sqs = new SQSClient({ region: REGION });

/**
 * Transcode a single video job.
 * @param {string} jobId - Job ID from DynamoDB
 * @param {string} inputKey - S3 key of source video
 * @param {Array<string>} formats - Output formats (e.g. ['mp4_720p'])
 */
async function transcode(jobId, inputKey, formats) {
  console.log(`🎬 Starting job ${jobId}...`);

  // Update status to PROCESSING
  await updateItem(jobId, 'SET #s = :s', { ':s': 'PROCESSING', '#s': 'status' });

  // Get input video stream from S3
  const input = await s3.send(new GetObjectCommand({ Bucket, Key: inputKey }));
  const inputStream = input.Body;

  // Transcode for each requested format
  for (const fmt of formats) {
    const outKey = `${process.env.S3_OUTPUT_PREFIX}${jobId}-${fmt}.mp4`;

    console.log(` Transcoding ${inputKey} → ${outKey} (${fmt})`);

    await new Promise((resolve, reject) => {
      const pass = new PassThrough();

      // Stream output directly to S3
      const uploader = new Upload({
        client: s3,
        params: {
          Bucket,
          Key: outKey,
          Body: pass,
          ContentType: 'video/mp4'
        }
      });

      uploader.done().then(resolve).catch(reject);

      let command = ffmpeg(inputStream)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4');

      if (fmt === 'mp4_720p') command.size('?x720').videoBitrate('3000k');
      if (fmt === 'mp4_480p') command.size('?x480').videoBitrate('1200k');
      if (fmt === 'mp4_360p') command.size('?x360').videoBitrate('800k');

      command.on('error', err => {
        console.error(` FFmpeg error on job ${jobId}:`, err.message);
        reject(err);
      });

      command.on('end', () => console.log(`✅ Completed ${fmt} for job ${jobId}`));
      command.pipe(pass);
    });
  }

  // Update job to COMPLETED
  await updateItem(jobId, 'SET #s = :s', { ':s': 'COMPLETED', '#s': 'status' });
  console.log(` Job ${jobId} completed successfully.`);
}

/**
 * Main SQS polling loop — continuously checks for new messages.
 */
async function loop() {
  console.log(' Worker started. Listening for SQS messages...');

  while (true) {
    try {
      const resp = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 300
        })
      );

      const msg = resp.Messages?.[0];
      if (!msg) continue;

      const body = JSON.parse(msg.Body);
      console.log(` Received job message: ${body.jobId}`);

      try {
        await transcode(body.jobId, body.inputKey, body.outputs);
        await sqs.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle: msg.ReceiptHandle }));
        console.log(` Message deleted for job ${body.jobId}`);
      } catch (err) {
        console.error(` Job ${body.jobId} failed:`, err.message);
        await updateItem(body.jobId, 'SET #s = :s, error = :e', {
          ':s': 'FAILED',
          ':e': err.message,
          '#s': 'status'
        });
      }
    } catch (err) {
      console.error(' SQS receive error:', err.message);
      await new Promise(r => setTimeout(r, 5000)); // small backoff before retry
    }
  }
}

// Start the loop
loop().catch(err => {
  console.error(' Worker crashed:', err);
  process.exit(1);
});
