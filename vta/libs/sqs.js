// vta/middleware/verifyJwt.js
// Middleware to verify Cognito JWT tokens for protected routes

import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

let jwksCache = null;

/**
 * Fetch and cache Cognito JSON Web Keys (JWKS)
 * @param {string} kid - Key ID from the JWT header
 * @returns {string} PEM-formatted key for signature verification
 */
async function getPem(kid) {
  if (!jwksCache) {
    const jwksUrl = process.env.COGNITO_JWKS;
    try {
      const res = await axios.get(jwksUrl);
      jwksCache = res.data;
    } catch (err) {
      console.error('❌ Failed to fetch Cognito JWKS:', err);
      throw new Error('Unable to verify token');
    }
  }

  const jwk = jwksCache.keys.find(k => k.kid === kid);
  if (!jwk) throw new Error('Invalid token key ID');
  return jwkToPem(jwk);
}

/**
 * Express middleware to verify Cognito JWT.
 */
export async function verifyJwt(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Missing Bearer token' });
    }

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header.kid) {
      return res.status(401).json({ message: 'Invalid token structure' });
    }

    const pem = await getPem(decoded.header.kid);
    const payload = jwt.verify(token, pem, { algorithms: ['RS256'] });

    // Optionally validate issuer and audience
    const expectedIssuer = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
    if (payload.iss !== expectedIssuer) {
      return res.status(401).json({ message: 'Invalid token issuer' });
    }

    req.user = {
      sub: payload.sub,
      username: payload['cognito:username'],
      email: payload.email
    };

    next();
  } catch (err) {
    console.error('❌ JWT verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token', error: err.message });
  }
}
