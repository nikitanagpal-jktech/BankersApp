import { Router } from 'express';
import { requireBankerAuth } from '../middleware/bankerAuth';
import {
  loginBanker,
  getCurrentBanker,
  logoutBanker,
} from '../controllers/authController';

const router = Router();

// Public auth endpoints
router.post('/login', loginBanker);
router.post('/logout', logoutBanker);

// Authenticated session check
router.get('/me', requireBankerAuth, getCurrentBanker);

export default router;