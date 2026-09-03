import { Router } from 'express';
import {
  getAllCustomers,
  getCustomers,
  getCustomerByIdOrAccount,
  updateCustomer,
  searchCustomers
} from '../controllers/customerController';
import { BankerAuth } from '../middleware/bankerAuth';

const router = Router();

if (typeof BankerAuth !== 'function') {
  throw new Error("bankerAuth middleware is undefined. Check your export/import statement in bankerAuth.ts");
}

// Apply banker authentication middleware to all customer routes
router.use(BankerAuth);

// GET paginated list of branch customers (e.g., /api/banker/customers/all?page=1)
router.get('/all', getAllCustomers);

// GET search customers with pagination (e.g., /api/banker/customers/search?q=Aman&page=1)
router.get('/search', searchCustomers);

// GET customer by lookup identifier (CIF or Account Number)
router.get('/lookup/:identifier', getCustomerByIdOrAccount);

// GET specific customer profile and linked accounts by customerId
router.get('/:customerId/details', getCustomers);

// PUT update customer profile details
router.put('/:customerId', updateCustomer);

export default router;