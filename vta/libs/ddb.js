// vta/libs/ddb.js
// Handles DynamoDB operations (CRUD) for video transcoding jobs

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
import { REGION } from './aws.js';

dotenv.config();

// Initialize DynamoDB DocumentClient (simpler JSON interface)
const ddbClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const TableName = process.env.DDB_TABLE;

/**
 * Create a new job record in DynamoDB
 * @param {Object} item - Job metadata object
 */
export async function putItem(item) {
  try {
    if (!item.id) {
      console.warn(' Missing id field, automatically setting it from jobId');
      item.id = item.jobId || crypto.randomUUID();
    }

    await ddb.send(new PutCommand({ TableName, Item: item }));
    console.log(` Saved job ${item.id} to DynamoDB`);
    return { success: true, id: item.id };
  } catch (err) {
    console.error(' DynamoDB putItem error:', err);
    throw err;
  }
}

/**
 * Get job metadata by jobId (mapped to DynamoDB partition key "id")
 * @param {string} jobId - Unique job identifier
 * @returns {Promise<Object>} Job record or null
 */
export async function getItem(jobId) {
  try {
    const result = await ddb.send(
      new GetCommand({ TableName, Key: { id: jobId } })
    );
    return result;
  } catch (err) {
    console.error(' DynamoDB getItem error:', err);
    throw err;
  }
}

/**
 * Update job attributes (status, outputKey, etc.)
 * @param {string} jobId - Job ID
 * @param {string} expr - DynamoDB update expression
 * @param {Object} values - ExpressionAttributeValues
 */
// Update job status or outputs safely
export async function updateItem(jobId, expr, values, names = {}) {
  try {
    const params = {
      TableName,
      Key: { id: jobId }, // match your table's key name
      UpdateExpression: expr,
      ExpressionAttributeValues: values,
    };

    // only add ExpressionAttributeNames if provided
    if (Object.keys(names).length > 0) {
      params.ExpressionAttributeNames = names;
    }

    return await ddb.send(new UpdateCommand(params));
  } catch (err) {
    console.error("DynamoDB updateItem error:", err);
    throw err;
  }
}


/**
 * Query all jobs created by a specific user (via Cognito sub)
 * @param {string} userSub - Cognito user identifier
 */
export async function queryByUser(userSub) {
  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName,
        IndexName: 'ByUser', // Must match your GSI name in DynamoDB
        KeyConditionExpression: 'userSub = :u',
        ExpressionAttributeValues: { ':u': userSub },
        ScanIndexForward: false
      })
    );
    return result;
  } catch (err) {
    console.error(' DynamoDB queryByUser error:', err);
    throw err;
  }
}

export default { putItem, getItem, updateItem, queryByUser };
