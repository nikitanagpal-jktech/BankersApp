import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: '8h',
  COOKIE_MAX_AGE_MS: 8 * 60 * 60 * 1000,
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};