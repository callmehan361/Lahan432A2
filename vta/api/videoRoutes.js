// Returns a list of all video jobs for the authenticated user

import express from 'express';
import { queryByUser } from '../libs/ddb.js';
import { verifyJwt } from './middleware/verifyJwt.js';

const router = express.Router();

/**
 * GET /videos
 * Fetch all video jobs belonging to the logged-in user
 */
router.get('/', verifyJwt, async (req, res) => {
  try {
    const userSub = req.user.sub;

    if (!userSub) {
      return res.status(401).json({ message: 'Invalid user token' });
    }

    // Query DynamoDB for this user's jobs
    const result = await queryByUser(userSub);
    const videos = result.Items || [];

    res.json(videos);
  } catch (err) {
    console.error(' Error fetching user videos:', err.message);
    res.status(500).json({
      message: 'Failed to fetch user videos',
      error: err.message
    });
  }
});

export default router;
