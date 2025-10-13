// Worker that processes video transcoding jobs from SQS

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
import { getParameter } from "../libs/params.js";
import { getSecret } from "../libs/secrets.js";

// Initialize FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

async function initConfig() {
  console.log("Loading configuration from Parameter Store and Secrets Manager...");

  const [
    bucket,
    uploadPrefix,
    outputPrefix,
    secretValues
  ] = await Promise.all([
    getParameter("/lahana2/s3bucket"),
    getParameter("/lahana2/s3upload"),
    getParameter("/lahana2/s3output"),
    getSecret("lahana2secret")
  ]);

  console.log("Configuration loaded successfully.");
  return {
    Bucket: bucket,
    UploadPrefix: uploadPrefix,
    OutputPrefix: outputPrefix,
    Secrets: secretValues
  };
}

// -----------------------------
// Download file from S3
// -----------------------------
async function downloadFromS3(s3, Bucket, Key, localPath) {
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
async function uploadToS3(s3, Bucket, Key, filePath, contentType) {
  const fileStream = fs.createReadStream(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key,
      Body: fileStream,
      ContentType: contentType
    })
  );
  console.log(`Uploaded ${Key} to S3`);
}

// -----------------------------
// Transcode logic
// -----------------------------
async function transcode(config, jobId, inputKey, targetFormat) {
  const s3 = new S3Client({ region: REGION });
  const tmpInput = `/tmp/${jobId}-input`;
  const tmpOutput = `/tmp/${jobId}-output.${targetFormat}`;
  const outKey = `${config.OutputPrefix}${jobId}.${targetFormat}`;

  console.log(`Starting job ${jobId}: ${inputKey} → ${targetFormat}`);

  try {
    await updateItem(
      jobId,
      "SET #s = :s",
      { ":s": "PROCESSING" },
      { "#s": "status" }
    );

    await downloadFromS3(s3, config.Bucket, inputKey, tmpInput);
    console.log("Input video downloaded.");

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

    console.log("Transcoding complete.");

    await uploadToS3(s3, config.Bucket, outKey, tmpOutput, "video/mp4");

    await updateItem(
      jobId,
      "SET #s = :s",
      { ":s": "COMPLETED" },
      { "#s": "status" }
    );

    console.log(`Job ${jobId} completed successfully.`);
    fs.unlinkSync(tmpInput);
    fs.unlinkSync(tmpOutput);
  } catch (err) {
    console.error(`Conversion failed for job ${jobId}:`, err.message);

    await updateItem(
      jobId,
      "SET #s = :s, #err = :e",
      { ":s": "FAILED", ":e": err.message },
      { "#s": "status", "#err": "error" }
    );
  }
}

// -----------------------------
// SQS Polling Loop
// -----------------------------
async function loop(config) {
  const sqs = new SQSClient({ region: REGION });
  console.log("Worker started. Listening for SQS messages...");

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
      await transcode(config, jobId, inputKey, targetFormat);

      await sqs.send(
        new DeleteMessageCommand({
          QueueUrl,
          ReceiptHandle: msg.ReceiptHandle
        })
      );

      console.log(`Message deleted for job ${jobId}`);
    } catch (err) {
      console.error("Worker loop error:", err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// -----------------------------
// Bootstrapping
// -----------------------------
(async () => {
  try {
    const config = await initConfig();
    await loop(config);
  } catch (err) {
    console.error("Worker crashed:", err.message);
  }
})();
