/*
// Handles user signup, confirmation, and login via AWS Cognito
import express from 'express';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  AdminInitiateAuthCommand
} from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const client = new CognitoIdentityProviderClient({ region: process.env.COGNITO_REGION });
const { COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET } = process.env;


 //Helper to generate Cognito SECRET_HASH if the app client has a secret.
 
function generateSecretHash(username) {
  if (!COGNITO_CLIENT_SECRET) return undefined;
  return crypto.createHmac('SHA256', COGNITO_CLIENT_SECRET)
    .update(username + COGNITO_CLIENT_ID)
    .digest('base64');
}


//User signup (registration)

router.post('/signup', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email)
    return res.status(400).json({ message: 'Missing username, password, or email' });

  try {
    await client.send(
      new SignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: username,
        Password: password,
        SecretHash: generateSecretHash(username),
        UserAttributes: [
          { Name: 'email', Value: email }
        ]
      })
    );
    res.json({ message: 'Signup successful. Check your email for confirmation code.' });
  } catch (err) {
    console.error(' Signup error:', err.message);
    res.status(400).json({ message: err.message });
  }
});


//Confirm user signup (email verification)

router.post('/confirm', async (req, res) => {
  const { username, code } = req.body;

  if (!username || !code)
    return res.status(400).json({ message: 'Missing username or confirmation code' });

  try {
    await client.send(
      new ConfirmSignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: username,
        ConfirmationCode: code,
        SecretHash: generateSecretHash(username)
      })
    );
    res.json({ message: '✅ User confirmed successfully.' });
  } catch (err) {
    console.error(' Confirmation error:', err.message);
    res.status(400).json({ message: err.message });
  }
});


//User login (returns tokens)

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: 'Missing username or password' });

  try {
    const response = await client.send(
      new AdminInitiateAuthCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        ClientId: COGNITO_CLIENT_ID,
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
          SECRET_HASH: generateSecretHash(username)
        }
      })
    );

    const auth = response.AuthenticationResult || {};
    res.json({
      idToken: auth.IdToken,
      accessToken: auth.AccessToken,
      refreshToken: auth.RefreshToken,
      expiresIn: auth.ExpiresIn
    });
  } catch (err) {
    console.error(' Login error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

export default router;
*/



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

