// Middleware to verify AWS Cognito JWT tokens for protected API routes

import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

let jwksCache = null;

/**
 * Fetch and cache JWKS (JSON Web Key Set) from Cognito
 * Each key is used to verify JWT signatures.
 */
async function getPem(kid) {
  if (!jwksCache) {
    const jwksUrl = process.env.COGNITO_JWKS;
    if (!jwksUrl) throw new Error('Missing COGNITO_JWKS in environment variables');

    try {
      const res = await axios.get(jwksUrl);
      jwksCache = res.data;
    } catch (err) {
      console.error(' Failed to fetch JWKS:', err.message);
      throw new Error('Unable to verify token (JWKS fetch failed)');
    }
  }

  const jwk = jwksCache.keys.find(k => k.kid === kid);
  if (!jwk) throw new Error('Invalid token key ID');
  return jwkToPem(jwk);
}

/**
 * Middleware function that verifies JWT and attaches the user info to req.user
 */
export async function verifyJwt(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Missing Bearer token' });
    }

    // Decode JWT without verifying to get KID
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header.kid) {
      return res.status(401).json({ message: 'Invalid token structure' });
    }

    // Get PEM key for signature verification
    const pem = await getPem(decoded.header.kid);

    // Verify the token's signature and claims
    const payload = jwt.verify(token, pem, { algorithms: ['RS256'] });

    // Optional: Verify issuer matches your Cognito User Pool
    const expectedIssuer = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
    if (payload.iss !== expectedIssuer) {
      return res.status(401).json({ message: 'Invalid token issuer' });
    }

    // Attach user info to request
    req.user = {
      sub: payload.sub,
      username: payload['cognito:username'],
      email: payload.email
    };

    next();
  } catch (err) {
    console.error(' JWT verification failed:', err.message);
    res.status(401).json({ message: 'Invalid or expired token', error: err.message });
  }
}
