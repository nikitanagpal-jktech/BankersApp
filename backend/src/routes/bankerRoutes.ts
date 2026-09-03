import { Router } from 'express';
import { BankerAuth } from '../middleware/bankerAuth';
import * as bankerCtrl from '../controllers/bankerController';

const router = Router();

// Auth
router.post('/auth/login', bankerCtrl.login);
router.get('/auth/me', BankerAuth, bankerCtrl.getProfile);

// CIF & Accounts
router.post('/customers/onboard', BankerAuth, bankerCtrl.onboardCustomer);
router.post('/accounts/open', BankerAuth, bankerCtrl.openAdditionalAccount);
router.get('/accounts/:accountNumber', BankerAuth, bankerCtrl.getAccountTransactions);
router.get('/accounts/:accountNumber/passbook', BankerAuth, bankerCtrl.getPassbook);

// OTC Counter
router.post('/transactions/deposit', BankerAuth, bankerCtrl.depositCash);
router.post('/transactions/withdraw', BankerAuth, bankerCtrl.withdrawCash);
router.post('/transactions/transfer', BankerAuth, bankerCtrl.transferFunds);

// Ledger
router.get('/transactions', BankerAuth, bankerCtrl.getAllTransactions);

export default router;