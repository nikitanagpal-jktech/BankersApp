import { Router } from 'express';
import authRoutes from './authRoutes';
import accountRoutes from './accountRoutes';
import transactionRoutes from './transactionRoutes';
import loanRoutes from './loanRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/loans', loanRoutes);

export default router;