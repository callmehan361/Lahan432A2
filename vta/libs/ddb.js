// vta/libs/ddb.js
// Handles DynamoDB operations (CRUD) for video transcoding jobs

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import dotenv from "dotenv";
import { REGION } from "./aws.js";

dotenv.config();

// Initialize DocumentClient (simpler JSON handling)
const ddbClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const TableName = process.env.DDB_TABLE;

/**
 *  Create a new video job record
 * Automatically ensures `id` exists (matches jobId)
 */
export async function putItem(item) {
  try {
    if (!item.id) {
      item.id = item.jobId || crypto.randomUUID();
      console.warn(` No 'id' field found, using ${item.id} as primary key`);
    }

    await ddb.send(new PutCommand({ TableName, Item: item }));
    console.log(` Saved job ${item.id} to DynamoDB`);
    return { success: true, id: item.id };
  } catch (err) {
    console.error(" DynamoDB putItem error:", err);
    throw err;
  }
}

/**
 *  Get job metadata by jobId (uses id as the primary key)
 */
export async function getItem(jobId) {
  try {
    const result = await ddb.send(
      new GetCommand({ TableName, Key: { id: jobId } })
    );
    return result?.Item || null;
  } catch (err) {
    console.error(" DynamoDB getItem error:", err);
    throw err;
  }
}

/**
 *  Update job fields (status, error message, output key, etc.)
 * Uses flexible support for ExpressionAttributeNames when needed.
 */
export async function updateItem(jobId, expr, values, names = {}) {
  try {
    const params = {
      TableName,
      Key: { id: jobId },
      UpdateExpression: expr,
      ExpressionAttributeValues: values,
    };

    // Only attach ExpressionAttributeNames if provided
    if (Object.keys(names).length > 0) {
      params.ExpressionAttributeNames = names;
    }

    const result = await ddb.send(new UpdateCommand(params));
    console.log(` Updated job ${jobId} in DynamoDB`);
    return result;
  } catch (err) {
    console.error(" DynamoDB updateItem error:", err);
    throw err;
  }
}

/**
 *  Query all jobs created by a specific user (by Cognito sub)
 */
export async function queryByUser(userSub) {
  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName,
        IndexName: "ByUser", // must match your GSI name
        KeyConditionExpression: "userSub = :u",
        ExpressionAttributeValues: { ":u": userSub },
        ScanIndexForward: false, // newest first
      })
    );
    return result.Items || [];
  } catch (err) {
    console.error(" DynamoDB queryByUser error:", err);
    throw err;
  }
}

export default { putItem, getItem, updateItem, queryByUser };
