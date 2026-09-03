import { Router } from 'express';
import { requireBankerAuth } from '../middleware/bankerAuth';
import * as accountCtrl from '../controllers/accountController';

const router = Router();

router.use(requireBankerAuth);
router.get('/all', accountCtrl.getBranchAccounts);
router.post('/onboard', accountCtrl.onboardCustomer);
router.post('/open', accountCtrl.openAdditionalAccount);
router.put('/customer/:customer_id', accountCtrl.updateCustomers);
router.get('/:accountNumber', accountCtrl.getAccountTransactions);
router.get('/:accountNumber/passbook', accountCtrl.getPassbook);

export default router;