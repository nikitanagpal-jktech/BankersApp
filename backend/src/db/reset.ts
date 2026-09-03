import { db, pool } from './index';
import { sql } from 'drizzle-orm';

async function reset() {
  console.log('Deleting all application data...');
  await db.execute(sql`
    TRUNCATE TABLE
      "loan_schedules",
      "transactions",
      "loan_details",
      "accounts",
      "bankers",
      "customers",
      "branches"
    RESTART IDENTITY CASCADE;
  `);
  console.log('All application data deleted. Database schema preserved.');
  await pool.end();
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});