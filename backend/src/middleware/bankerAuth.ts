import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { SERVER_BOOT_ID } from '../config/session';

export interface AuthenticatedBankerRequest extends Request {
  banker?: {
    banker_id: string;
    employee_id: string;
    branch_id: string;
    branch_name: string;
    ifsc_code: string;
    name: string;
    boot_id?: string;
  };
}

export function BankerAuth(
  req: AuthenticatedBankerRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token =
      req.cookies?.banker_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Session missing or expired.' });
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;

    // Invalidate session if backend service restarted
    if (decoded.boot_id !== SERVER_BOOT_ID) {
      res.clearCookie('banker_token', { path: '/' });
      return res.status(401).json({ error: 'Server restarted. Please log in again.' });
    }

    req.banker = decoded;
    next();
  } catch (error) {
    res.clearCookie('banker_token', { path: '/' });
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });
  }
}

export const requireBankerAuth = BankerAuth;