// Handles user authentication with AWS Cognito
// Securely loads Cognito credentials from Secrets Manager

import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import dotenv from "dotenv";
import { getSecret } from "./secrets.js";

dotenv.config();

let config = {
  REGION: process.env.AWS_REGION || "ap-southeast-2",
  USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
  CLIENT_ID: process.env.COGNITO_CLIENT_ID,
};

let cognitoClient;

/**
 * Initialize Cognito configuration — first from Secrets Manager, then fallback to .env.
 */
async function initCognito() {
  try {
    const secret = await getSecret("lahana2secret");
    config = {
      REGION: secret.REGION || config.REGION,
      USER_POOL_ID: secret.COGNITO_USER_POOL_ID || config.USER_POOL_ID,
      CLIENT_ID: secret.COGNITO_CLIENT_ID || config.CLIENT_ID,
    };
    console.log(" Cognito config loaded from Secrets Manager");
  } catch (err) {
    console.warn(" Could not load from Secrets Manager, using .env values instead");
  }

  cognitoClient = new CognitoIdentityProviderClient({ region: config.REGION });
}

await initCognito(); // Run at import time

/**
 * Register a new user
 */
export async function signup(username, email, password) {
  const params = {
    ClientId: config.CLIENT_ID,
    Username: username,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  };

  await cognitoClient.send(new SignUpCommand(params));
  return { message: "User registered successfully. Please check email for confirmation." };
}

/**
 * Confirm a user's signup
 */
export async function confirm(username, code) {
  const params = {
    ClientId: config.CLIENT_ID,
    Username: username,
    ConfirmationCode: code,
  };

  await cognitoClient.send(new ConfirmSignUpCommand(params));
  return { message: "User confirmed successfully" };
}

/**
 * Login user and return JWT token
 */
export async function login(username, password) {
  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: config.CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };

  const response = await cognitoClient.send(new InitiateAuthCommand(params));

  return {
    message: "Login successful",
    token: response.AuthenticationResult.IdToken,
  };
}
