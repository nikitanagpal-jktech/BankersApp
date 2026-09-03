import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import customerRoutes from './routes/customerRoutes';
import transactionRoutes from './routes/transactionRoutes';
import loanRoutes from './routes/loanRoutes';
import { ENV } from './config/env';

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

app.listen(ENV.PORT, () => {
  console.log(`\n==================================================`);
  console.log(` BankersApp CBS Server running on Port ${ENV.PORT}`);
  console.log(`==================================================\n`);
});

export default app;