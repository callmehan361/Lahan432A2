// vta/libs/aws.js
// Sets up AWS SDK region configuration for the app

import dotenv from 'dotenv';
dotenv.config();

// Define the AWS region to use across all SDK clients
export const REGION = process.env.AWS_REGION || 'ap-southeast-2';

// Optionally export helper AWS SDK clients if you want a central import point:
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SQSClient } from '@aws-sdk/client-sqs';

export const s3Client = new S3Client({ region: REGION });
export const ddbClient = new DynamoDBClient({ region: REGION });
export const sqsClient = new SQSClient({ region: REGION });

// Export a default object for convenience (optional)
export default {
  REGION,
  s3Client,
  ddbClient,
  sqsClient
};
