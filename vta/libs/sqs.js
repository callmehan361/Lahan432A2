// vta/libs/sqs.js
// Handles AWS SQS operations for video transcoding jobs (enqueue, receive, delete)

import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SQS client
const sqs = new SQSClient({ region: process.env.AWS_REGION });
const QueueUrl = process.env.SQS_QUEUE_URL;

/**
 * Enqueue a new video job into SQS.
 * @param {object} jobData - Job details (jobId, inputKey, outputKey, etc.)
 */
export async function enqueueJob(jobData) {
  try {
    const params = {
      QueueUrl,
      MessageBody: JSON.stringify(jobData),
    };

    const command = new SendMessageCommand(params);
    const response = await sqs.send(command);

    console.log(' Job enqueued to SQS:', response.MessageId);
    return response;
  } catch (err) {
    console.error(' Failed to enqueue SQS message:', err);
    throw err;
  }
}

/**
 * Receive a job from SQS (used by the worker)
 */
export async function receiveJob() {
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 10, // long polling
    });

    const response = await sqs.send(command);
    return response.Messages ? response.Messages[0] : null;
  } catch (err) {
    console.error(' Failed to receive SQS message:', err);
    throw err;
  }
}

/**
 * Delete a processed job message from SQS
 * @param {string} receiptHandle - The receipt handle from ReceiveMessage
 */
export async function deleteJob(receiptHandle) {
  try {
    const command = new DeleteMessageCommand({
      QueueUrl,
      ReceiptHandle: receiptHandle,
    });

    await sqs.send(command);
    console.log(' Deleted message from SQS');
  } catch (err) {
    console.error(' Failed to delete SQS message:', err);
    throw err;
  }
}

// Export the SQS client and Queue URL if needed by other modules
export { sqs, QueueUrl };
