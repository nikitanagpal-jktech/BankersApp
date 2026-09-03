import { sql } from 'drizzle-orm';
import { db } from '../db';

/**
 * Fetches the next sequential Customer ID atomically from PostgreSQL sequence.
 * Result format: CUST000001, CUST000002, ...
 */
export async function getNextCustomerId(txOrDb: any = db): Promise<string> {
  const result = await txOrDb.execute(sql`SELECT nextval('customer_id_seq') AS next_val`);
  const val = Number(result.rows[0].next_val);
  return `CUST${val.toString().padStart(6, '0')}`;
}

/**
 * Formats a Branch ID.
 * Result format: BR001, BR002, ...
 */
export function formatBranchId(num: number): string {
  return `BR${num.toString().padStart(3, '0')}`;
}

/**
 * Formats a Banker ID.
 * Result format: BA00001, BA00002, ...
 */
export function formatBankerId(num: number): string {
  return `BA${num.toString().padStart(5, '0')}`;
}

/**
 * Generates a unique 12-digit account number.
 * Example: 100123456789
 */
export function generateAccountNumber(): string {
  const prefix = '100';
  const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${prefix}${randomPart}`;
}

/**
 * Generates a unique transaction reference.
 * Example: TXN_DEP_1715000000000_1234
 */
export function generateRefNumber(prefix: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}_${timestamp}_${randomSuffix}`;
}