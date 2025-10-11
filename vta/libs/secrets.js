// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import dotenv from "dotenv";
dotenv.config();

const REGION = process.env.AWS_REGION || "ap-southeast-2";
const SECRET_NAME = process.env.SECRET_NAME || "lahana2secret";

const client = new SecretsManagerClient({
  region: REGION,
});
/**
 * Fetch a secret from AWS Secrets Manager.
 * Returns a parsed JSON object if the secret is JSON,
 * or a raw string if it's plain text.
 */
export async function getSecret(secretName = SECRET_NAME) {
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: "AWSCURRENT", // default
      })
    );

    const secretString = response.SecretString;

    // Try parsing as JSON; otherwise return plain text
    try {
      return JSON.parse(secretString);
    } catch {
      return secretString;
    }
  } catch (error) {
    console.error(" Secrets Manager error:", error);
    throw error;
  }
}