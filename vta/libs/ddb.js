// vta/libs/ddb.js
// Handles DynamoDB operations (CRUD) for video jobs

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
import { REGION } from './aws.js';

dotenv.config();

// Initialize the DocumentClient for easier JSON handling
const ddbClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const TableName = process.env.DDB_TABLE;

// Create a new video job entry
export async function putItem(item) {
  try {
    await ddb.send(new PutCommand({ TableName, Item: item }));
    return { success: true };
  } catch (err) {
    console.error('DynamoDB putItem error:', err);
    throw err;
  }
}

// Get job metadata by jobId
export async function getItem(jobId) {
  try {
    const result = await ddb.send(new GetCommand({ TableName, Key: { jobId } }));
    return result;
  } catch (err) {
    console.error('DynamoDB getItem error:', err);
    throw err;
  }
}

// Update job status or outputs
export async function updateItem(jobId, expr, values) {
  try {
    return await ddb.send(
      new UpdateCommand({
        TableName,
        Key: { jobId },
        UpdateExpression: expr,
        ExpressionAttributeValues: values,
        ExpressionAttributeNames: { '#s': 'status' }
      })
    );
  } catch (err) {
    console.error('DynamoDB updateItem error:', err);
    throw err;
  }
}

// Query all jobs by a user's Cognito sub
export async function queryByUser(userSub) {
  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName,
        IndexName: 'ByUser',
        KeyConditionExpression: 'userSub = :u',
        ExpressionAttributeValues: { ':u': userSub },
        ScanIndexForward: false
      })
    );
    return result;
  } catch (err) {
    console.error('DynamoDB queryByUser error:', err);
    throw err;
  }
}

export default { putItem, getItem, updateItem, queryByUser };
