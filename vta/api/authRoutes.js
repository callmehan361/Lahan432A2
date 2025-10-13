// Handles user signup, confirmation, and login via AWS Cognito

import express from 'express';
import crypto from 'crypto';
import { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const cognito = new CognitoIdentityProviderClient({ region: process.env.COGNITO_REGION });

// --- Signup ---
router.post('/signup', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const command = new SignUpCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: username,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: email }],
      SecretHash: crypto
        .createHmac('SHA256', process.env.COGNITO_CLIENT_SECRET)
        .update(username + process.env.COGNITO_CLIENT_ID)
        .digest('base64')
    });
    await cognito.send(command);
    res.json({ message: 'Signup successful. Please confirm your email.' });
  } catch (err) {
    console.error(' Signup error:', err);
    res.status(400).json({ message: err.message });
  }
});

// --- Confirm Signup ---
router.post('/confirm', async (req, res) => {
  const { username, code } = req.body;
  try {
    const command = new ConfirmSignUpCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: username,
      ConfirmationCode: code,
      SecretHash: crypto
        .createHmac('SHA256', process.env.COGNITO_CLIENT_SECRET)
        .update(username + process.env.COGNITO_CLIENT_ID)
        .digest('base64')
    });
    await cognito.send(command);
    res.json({ message: 'User confirmed successfully.' });
  } catch (err) {
    console.error(' Confirmation error:', err);
    res.status(400).json({ message: err.message });
  }
});

// --- Login ---
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const secretHash = crypto
      .createHmac('SHA256', process.env.COGNITO_CLIENT_SECRET)
      .update(username + process.env.COGNITO_CLIENT_ID)
      .digest('base64');

    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: secretHash
      }
    });

    const response = await cognito.send(command);

    res.json({
      idToken: response.AuthenticationResult.IdToken,
      accessToken: response.AuthenticationResult.AccessToken,
      refreshToken: response.AuthenticationResult.RefreshToken
    });
  } catch (err) {
    console.error(' Login error:', err);
    res.status(400).json({ message: err.message });
  }
});

export default router;

