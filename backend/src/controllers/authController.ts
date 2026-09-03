import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { ENV } from '../config/env';
import { SERVER_BOOT_ID } from '../config/session';
import { AuthenticatedBankerRequest } from '../middleware/bankerAuth';

export async function loginBanker(req: Request, res: Response) {
  try {
    const { employee_id, password } = req.body;

    if (!employee_id || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required.' });
    }

    const [banker] = await db
      .select({
        banker_id: schema.bankers.banker_id,
        employee_id: schema.bankers.employee_id,
        name: schema.bankers.name,
        password_hash: schema.bankers.password_hash,
        branch_id: schema.bankers.branch_id,
        branch_name: schema.branches.branch_name,
        ifsc_code: schema.branches.ifsc_code,
      })
      .from(schema.bankers)
      .innerJoin(schema.branches, eq(schema.bankers.branch_id, schema.branches.branch_id))
      .where(eq(schema.bankers.employee_id, employee_id.trim().toUpperCase()));

    if (!banker) {
      return res.status(401).json({ error: 'Invalid Employee ID or credentials.' });
    }

    const isValidPassword = await bcrypt.compare(password, banker.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid Employee ID or credentials.' });
    }

    const token = jwt.sign(
      {
        banker_id: banker.banker_id,
        employee_id: banker.employee_id,
        name: banker.name,
        branch_id: banker.branch_id,
        branch_name: banker.branch_name,
        ifsc_code: banker.ifsc_code,
        boot_id: SERVER_BOOT_ID,
      },
      ENV.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('banker_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      banker: {
        banker_id: banker.banker_id,
        employee_id: banker.employee_id,
        name: banker.name,
        branch_id: banker.branch_id,
        branch_name: banker.branch_name,
        ifsc_code: banker.ifsc_code,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: error.message || 'Login failed.' });
  }
}

export async function getCurrentBanker(req: AuthenticatedBankerRequest, res: Response) {
  if (!req.banker) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  return res.json({ banker: req.banker });
}

export async function logoutBanker(_req: Request, res: Response) {
  res.clearCookie('banker_token', { path: '/' });
  return res.json({ success: true, message: 'Logged out successfully.' });
}