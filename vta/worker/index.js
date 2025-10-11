/* //wuvrowvnwovnw3onrve3owvn3we

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
 */ //wuvrowvnwovnw3onrve3owvn3we

/*
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
 */ //wuvrowvnwovnw3onrve3owvn3we


 /*
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
*/ //wuvrowvnwovnw3onrve3owvn3we



/* //wibviwbwovn3onrve3owvn3we
// vta/worker/index.js
// Worker: converts uploaded MP4 video into a single other format

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

setFfmpegPath();

const sqs = new SQSClient({ region: REGION });

/**
 * Convert a video to a new format and upload result.
 */ ////wibviwbwovn3onrve3owvn3we


/*
async function convert(jobId, inputKey, targetFormat) {
  console.log(` Starting job ${jobId} → ${targetFormat}`);

await updateItem(
  jobId,
  'SET #s = :s',
  { ':s': 'PROCESSING' },
  { '#s': 'status' }
);

  const input = await s3.send(new GetObjectCommand({ Bucket, Key: inputKey }));
  const inputStream = input.Body;

  let videoCodec = 'libx264';
  let audioCodec = 'aac';
  let contentType = 'video/mp4';

  if (targetFormat === 'mov') {
    videoCodec = 'libx264';
    audioCodec = 'aac';
    contentType = 'video/quicktime';
  } else if (targetFormat === 'mkv') {
    videoCodec = 'libx264';
    audioCodec = 'aac';
    contentType = 'video/x-matroska';
  } else if (targetFormat === 'webm') {
    videoCodec = 'libvpx-vp9';
    audioCodec = 'libopus';
    contentType = 'video/webm';
  } else if (targetFormat === 'avi') {
    videoCodec = 'mpeg4';
    audioCodec = 'mp3';
    contentType = 'video/x-msvideo';
  }

  const outKey = `${process.env.S3_OUTPUT_PREFIX}${jobId}.${targetFormat}`;

  await new Promise((resolve, reject) => {
    const pass = new PassThrough();

    const uploader = new Upload({
      client: s3,
      params: {
        Bucket,
        Key: outKey,
        Body: pass,
        ContentType: contentType
      }
    });

    uploader.done().then(resolve).catch(reject);

    ffmpeg(inputStream)
      .setFfmpegPath(ffmpegPath)
      .videoCodec(videoCodec)
      .audioCodec(audioCodec)
      .format(targetFormat)
      .on('start', cmd => console.log(` ${cmd}`))
      .on('error', err => reject(err))
      .on('end', resolve)
      .pipe(pass);
  });

  await updateItem(
  jobId,
  'SET #s = :s, #o = :o, #u = :u',
  {
    ':s': 'COMPLETED',
    ':o': outKey,
    ':u': Date.now()
  },
  {
    '#s': 'status',
    '#o': 'outputKey',
    '#u': 'updatedAt'
  }
);


  console.log(` Job ${jobId} completed → ${targetFormat}`);
}

/**
 * SQS polling loop
 */ //wibviwbwovn3onrve3owvn3we

/*
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
      console.log(` Received job ${body.jobId}`);

      try {
        await convert(body.jobId, body.inputKey, body.targetFormat);
        await sqs.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle: msg.ReceiptHandle }));
        console.log(` Deleted message for job ${body.jobId}`);
      } catch (err) {
        console.error(` Conversion failed for job ${body.jobId}: ${err.message}`);
        await updateItem(
          body.jobId,
          'SET #s = :s, #e = :e',
          {
            ':s': 'FAILED',
            ':e': err.message
          },
          {
            '#s': 'status',
            '#e': 'error'
          }
        );
      }
    } catch (err) {
      console.error(' SQS receive error:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

loop().catch(err => {
  console.error(' Worker crashed:', err);
  process.exit(1);
});
*/ //wibviwbwovn3onrve3owvn3we

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand
} from "@aws-sdk/client-sqs";
import { REGION } from "../libs/aws.js";
import { updateItem } from "../libs/ddb.js";
import { QueueUrl } from "../libs/sqs.js";

ffmpeg.setFfmpegPath(ffmpegPath);
const s3 = new S3Client({ region: REGION });
const sqs = new SQSClient({ region: REGION });
const Bucket = process.env.S3_BUCKET;

// -----------------------------
// Download file from S3
// -----------------------------
async function downloadFromS3(Key, localPath) {
  const data = await s3.send(new GetObjectCommand({ Bucket, Key }));
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(localPath);
    data.Body.pipe(fileStream);
    data.Body.on("error", reject);
    fileStream.on("finish", resolve);
  });
}

// -----------------------------
// Upload file to S3
// -----------------------------
async function uploadToS3(Key, filePath, contentType) {
  const fileStream = fs.createReadStream(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key,
      Body: fileStream,
      ContentType: contentType
    })
  );
  console.log(` Uploaded ${Key} to S3`);
}

// -----------------------------
// Transcode logic
// -----------------------------
async function transcode(jobId, inputKey, targetFormat) {
  const tmpInput = `/tmp/${jobId}-input`;
  const tmpOutput = `/tmp/${jobId}-output.${targetFormat}`;
  const outKey = `${process.env.S3_OUTPUT_PREFIX}${jobId}.${targetFormat}`;

  console.log(` Starting job ${jobId}: ${inputKey} → ${targetFormat}`);

  try {
    // Update to PROCESSING
    await updateItem(
      jobId,
      "SET #s = :s",
      { ":s": "PROCESSING" },
      { "#s": "status" }
    );

    // Download from S3
    await downloadFromS3(inputKey, tmpInput);
    console.log(" Input video downloaded");

    // Transcode using FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(tmpInput)
        .outputOptions("-movflags", "faststart")
        .videoCodec("libx264")
        .audioCodec("aac")
        .format(targetFormat)
        .output(tmpOutput)
        .on("end", resolve)
        .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .run();
    });

    console.log(" Transcoding complete");

    // Upload to S3
    await uploadToS3(outKey, tmpOutput, "video/mp4");

    // Update to COMPLETED
    await updateItem(
      jobId,
      "SET #s = :s",
      { ":s": "COMPLETED" },
      { "#s": "status" }
    );

    console.log(` Job ${jobId} completed successfully`);

    // Cleanup
    fs.unlinkSync(tmpInput);
    fs.unlinkSync(tmpOutput);
  } catch (err) {
    console.error(` Conversion failed for job ${jobId}:`, err.message);

    await updateItem(
      jobId,
      "SET #s = :s, #err = :e",
      { ":s": "FAILED", ":e": err.message },
      { "#s": "status", "#err": "error" } // reserved keyword fix
    );
  }
}

// -----------------------------
// Worker SQS polling loop
// -----------------------------
async function loop() {
  console.log(" Worker started. Listening for SQS messages...");

  while (true) {
    try {
      const resp = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20
        })
      );

      const msg = resp.Messages?.[0];
      if (!msg) continue;

      const { jobId, inputKey, targetFormat } = JSON.parse(msg.Body);
      await transcode(jobId, inputKey, targetFormat);

      await sqs.send(
        new DeleteMessageCommand({
          QueueUrl,
          ReceiptHandle: msg.ReceiptHandle
        })
      );

      console.log(` Message deleted for job ${jobId}`);
    } catch (err) {
      console.error(" Worker loop error:", err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

loop().catch((err) => console.error(" Worker crashed:", err));
