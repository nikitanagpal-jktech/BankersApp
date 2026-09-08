import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import customerRoutes from './routes/customerRoutes';
import transactionRoutes from './routes/transactionRoutes';
import loanRoutes from './routes/loanRoutes';
import { ENV } from './config/env';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './db'; // Adjust path to your Drizzle db instance

// Run migrations on startup
(async () => {
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
})();

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

// Route Endpoints
app.use('/api/banker/auth', authRoutes);
app.use('/api/banker/accounts', accountRoutes);
app.use('/api/banker/customers', customerRoutes);
app.use('/api/banker/transactions', transactionRoutes);
app.use('/api/banker/loans', loanRoutes);
// Root Route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'BankersApp CBS Server is running successfully' });
});

app.listen(ENV.PORT, () => {
  console.log(`\n==================================================`);
  console.log(` BankersApp CBS Server running on Port ${ENV.PORT}`);
  console.log(`==================================================\n`);
});

export default app;