import { Router } from 'express';
import { requireBankerAuth } from '../middleware/bankerAuth';

import {
  getCustomerAccountsForLoan,
  sanctionLoan,
} from '../controllers/loanController';

import {
  getAllLoans,
} from '../controllers/loanOverviewController';

import {
  getLoanSchedule,
} from '../controllers/loanScheduleController';

import {
  payLoanEmi,
} from '../controllers/loanTransactionController';

const router = Router();

router.use(requireBankerAuth);

router.get('/all', getAllLoans);

router.get(
  '/customer/:customerId/accounts',
  getCustomerAccountsForLoan,
);

router.post('/sanction', sanctionLoan);

router.post('/pay-emi', payLoanEmi);

router.get(
  '/account/:accountNumber/schedule',
  getLoanSchedule,
);

export default router;