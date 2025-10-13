// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html

// Securely fetch configuration secrets from AWS Secrets Manager

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import dotenv from "dotenv";
dotenv.config();

const REGION = process.env.AWS_REGION || "ap-southeast-2";
const SECRET_NAME = process.env.SECRET_NAME || "lahana2secret";

// Initialize AWS Secrets Manager client
const client = new SecretsManagerClient({ region: REGION });

/**
 * Fetch and parse a secret from AWS Secrets Manager.
 * @param {string} secretName - Secret name (default: lahana2secret)
 * @returns {Promise<Object|string>} Parsed JSON or string value
 */
export async function getSecret(secretName = SECRET_NAME) {
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: "AWSCURRENT",
      })
    );

    const secretString = response.SecretString;

    try {
      return JSON.parse(secretString);
    } catch {
      return secretString;
    }
  } catch (error) {
    console.error(" Secrets Manager error:", error.message);
    throw error;
  }
}
