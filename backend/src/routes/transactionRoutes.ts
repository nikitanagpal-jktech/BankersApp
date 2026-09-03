import { Router } from 'express';
import { requireBankerAuth } from '../middleware/bankerAuth';
import * as transactionController from '../controllers/transactionController';

const router = Router();

router.use(requireBankerAuth);

router.get('/', transactionController.getAllTransactions);
router.get('/account/:accountNumber', transactionController.getAccountTransactions);
router.get('/:accountNumber', transactionController.getAccountTransactions);

router.post('/deposit', transactionController.depositCash);
router.post('/withdraw', transactionController.withdrawCash);
router.post('/transfer', transactionController.transferFunds);

export default router;