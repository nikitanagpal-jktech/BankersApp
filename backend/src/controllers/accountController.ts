import { Response } from 'express';
import { eq, sql, desc } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { AuthenticatedBankerRequest } from '../middleware/bankerAuth';
import { DecimalMath } from '../utils/math';
import { generateAccountNumber, generateRefNumber, getNextCustomerId } from '../utils/generators';

export async function onboardCustomer(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const banker = req.banker!;
    const {
      first_name,
      last_name,
      dob,
      gender,
      marital_status,
      primary_mobile,
      secondary_phone,
      email,
      pan,
      aadhaar,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      account_type,
      initial_deposit,
    } = req.body;

    if (!first_name || !last_name || !dob || !primary_mobile || !pan || !aadhaar || !address_line1 || !city || !state || !postal_code || !account_type) {
      return res.status(400).json({ error: 'All mandatory KYC parameters and account type are required.' });
    }

    const depositAmount = initial_deposit ? Number(initial_deposit).toFixed(2) : '0.00';
    const minBalance = account_type === 'CURRENT' ? '1000.00' : '500.00';

    if (DecimalMath.isLessThan(depositAmount, minBalance)) {
      return res.status(400).json({
        error: `Initial deposit of ₹${depositAmount} does not meet the minimum balance floor ₹${minBalance}.`,
      });
    }

    const result = await db.transaction(async (tx) => {
      const nextCustId = await getNextCustomerId(tx);

      const [customer] = await tx
        .insert(schema.customers)
        .values({
          customer_id: nextCustId,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          dob: dob,
          gender: gender || 'Male',
          marital_status: marital_status || 'Single',
          primary_mobile: primary_mobile.trim(),
          secondary_phone: secondary_phone?.trim() || null,
          email: email?.trim() || null,
          pan: pan.trim().toUpperCase(),
          aadhaar: aadhaar.trim(),
          address_line1: address_line1.trim(),
          address_line2: address_line2?.trim() || null,
          city: city.trim(),
          state: state.trim(),
          postal_code: postal_code.trim(),
          country: country || 'India',
        })
        .returning();

      const newAccountNumber = generateAccountNumber();

      const [account] = await tx
        .insert(schema.accounts)
        .values({
          account_number: newAccountNumber,
          customer_id: customer.customer_id,
          branch_id: banker.branch_id,
          account_type,
          balance: depositAmount,
          min_balance: minBalance,
          status: 'ACTIVE',
        })
        .returning();

      if (Number(depositAmount) > 0) {
        await tx.insert(schema.transactions).values({
          ref_number: generateRefNumber('TXN_INIT'),
          from_account: null,
          to_account: account.account_number,
          type: 'DEPOSIT',
          amount: depositAmount,
          balance_after: depositAmount,
          banker_id: banker.banker_id,
          description: `Initial cash deposit during CreateAccount by ${banker.employee_id} at ${banker.ifsc_code}`,
        });
      }

      return { customer, account, branch_id: banker.branch_id, ifsc_code: banker.ifsc_code };
    });

    return res.status(201).json({ message: 'Customer CIF and Account initialized successfully.', data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'CreateAccount failed.' });
  }
}

export async function getBranchAccounts(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const banker = req.banker!;
    const page = Number(req.query.page) || 1;
    const search = (req.query.search as string)?.trim() || '';
    const limit = 10;
    const offset = (page - 1) * limit;

    // Build base query conditions
    const conditions = [eq(schema.accounts.branch_id, banker.branch_id)];
    
    if (search) {
      conditions.push(
        sql`(${schema.accounts.account_number} ILIKE ${`%${search}%`} OR 
             concat(${schema.customers.first_name}, ' ', ${schema.customers.last_name}) ILIKE ${`%${search}%`} OR 
             ${schema.customers.customer_id} ILIKE ${`%${search}%`} OR 
             ${schema.customers.primary_mobile} ILIKE ${`%${search}%`})`
      );
    }

    const rows = await db
      .select({
        account_number: schema.accounts.account_number,
        account_type: schema.accounts.account_type,
        balance: schema.accounts.balance,
        min_balance: schema.accounts.min_balance,
        status: schema.accounts.status,
        created_at: schema.accounts.created_at,
        customer_id: schema.customers.customer_id,
        customer_name: sql<string>`concat(${schema.customers.first_name}, ' ', ${schema.customers.last_name})`,
        primary_mobile: schema.customers.primary_mobile,
        pan: schema.customers.pan,
        branch_name: schema.branches.branch_name,
        ifsc_code: schema.branches.ifsc_code,
      })
      .from(schema.accounts)
      .innerJoin(schema.customers, eq(schema.accounts.customer_id, schema.customers.customer_id))
      .innerJoin(schema.branches, eq(schema.accounts.branch_id, schema.branches.branch_id))
      .where(sql.join(conditions, sql` AND `))
      .orderBy(desc(schema.accounts.created_at))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.accounts)
      .innerJoin(schema.customers, eq(schema.accounts.customer_id, schema.customers.customer_id))
      .where(sql.join(conditions, sql` AND `));

    return res.json({ 
      accounts: rows,
      pagination: {
        currentPage: page,
        perPage: limit,
        totalPages: Math.ceil(Number(totalResult.count) / limit) || 1,
        totalItems: Number(totalResult.count),
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch accounts list.' });
  }
}

export async function updateCustomers(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const { customer_id } = req.params;
    const {
      first_name,
      last_name,
      dob,
      gender,
      marital_status,
      primary_mobile,
      secondary_phone,
      email,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'Customer ID is required.' });
    }

    if (!first_name || !last_name || !dob || !primary_mobile || !address_line1 || !city || !state || !postal_code) {
      return res.status(400).json({ error: 'All mandatory fields marked with an asterisk must be provided.' });
    }

    const [updated] = await db
      .update(schema.customers)
      .set({
        first_name,
        last_name,
        dob,
        gender: gender || 'Male',
        marital_status: marital_status || 'Single',
        primary_mobile,
        secondary_phone: secondary_phone || null,
        email: email || null,
        address_line1,
        address_line2: address_line2 || null,
        city,
        state,
        postal_code,
        country: country || 'India',
        updated_at: new Date(),
      })
      .where(eq(schema.customers.customer_id, customer_id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    return res.json({ message: 'Customer details updated successfully.', customer: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update customer details.' });
  }
}

export async function openAdditionalAccount(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const banker = req.banker!;
    const { customer_id, account_type, initial_deposit } = req.body;

    if (!customer_id || !account_type) {
      return res.status(400).json({ error: 'Customer ID and Account Type are required.' });
    }

    const depositAmount = initial_deposit ? Number(initial_deposit).toFixed(2) : '0.00';
    const minBalance = account_type === 'CURRENT' ? '1000.00' : '500.00';

    if (DecimalMath.isLessThan(depositAmount, minBalance)) {
      return res.status(400).json({
        error: `Deposit ₹${depositAmount} does not meet the minimum floor ₹${minBalance}.`,
      });
    }

    const result = await db.transaction(async (tx) => {
      const [customer] = await tx
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.customer_id, customer_id));

      if (!customer) throw new Error(`Customer ${customer_id} does not exist.`);

      const newAccountNumber = generateAccountNumber();

      const [account] = await tx
        .insert(schema.accounts)
        .values({
          account_number: newAccountNumber,
          customer_id: customer.customer_id,
          branch_id: banker.branch_id,
          account_type,
          balance: depositAmount,
          min_balance: minBalance,
          status: 'ACTIVE',
        })
        .returning();

      if (Number(depositAmount) > 0) {
        await tx.insert(schema.transactions).values({
          ref_number: generateRefNumber('TXN_INIT'),
          from_account: null,
          to_account: account.account_number,
          type: 'DEPOSIT',
          amount: depositAmount,
          balance_after: depositAmount,
          banker_id: banker.banker_id,
          description: `Initial OTC deposit by ${banker.employee_id} at ${banker.ifsc_code}`,
        });
      }

      return { account, customer, ifsc_code: banker.ifsc_code };
    });

    return res.status(201).json({ message: 'Additional account opened successfully.', data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Account opening failed.' });
  }
}

/**
 * Enhanced lookup supporting both Account Number and Customer ID (CIF)
 */
export async function getAccountTransactions(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const { accountNumber } = req.params;
    const query = accountNumber.trim();

    // 1. Try matching by Account Number first
    let rows = await db
      .select({
        account_number: schema.accounts.account_number,
        account_type: schema.accounts.account_type,
        balance: schema.accounts.balance,
        min_balance: schema.accounts.min_balance,
        status: schema.accounts.status,
        created_at: schema.accounts.created_at,
        branch_id: schema.branches.branch_id,
        branch_name: schema.branches.branch_name,
        ifsc_code: schema.branches.ifsc_code,
        customer_id: schema.customers.customer_id,
        first_name: schema.customers.first_name,
        last_name: schema.customers.last_name,
        dob: schema.customers.dob,
        gender: schema.customers.gender,
        marital_status: schema.customers.marital_status,
        primary_mobile: schema.customers.primary_mobile,
        secondary_phone: schema.customers.secondary_phone,
        email: schema.customers.email,
        pan: schema.customers.pan,
        aadhaar: schema.customers.aadhaar,
        address_line1: schema.customers.address_line1,
        address_line2: schema.customers.address_line2,
        city: schema.customers.city,
        state: schema.customers.state,
        postal_code: schema.customers.postal_code,
        country: schema.customers.country,
      })
      .from(schema.accounts)
      .innerJoin(schema.branches, eq(schema.accounts.branch_id, schema.branches.branch_id))
      .innerJoin(schema.customers, eq(schema.accounts.customer_id, schema.customers.customer_id))
      .where(eq(schema.accounts.account_number, query));

    // 2. Fallback: If not found, try matching by Customer ID (CIF)
    if (!rows.length) {
      rows = await db
        .select({
          account_number: schema.accounts.account_number,
          account_type: schema.accounts.account_type,
          balance: schema.accounts.balance,
          min_balance: schema.accounts.min_balance,
          status: schema.accounts.status,
          created_at: schema.accounts.created_at,
          branch_id: schema.branches.branch_id,
          branch_name: schema.branches.branch_name,
          ifsc_code: schema.branches.ifsc_code,
          customer_id: schema.customers.customer_id,
          first_name: schema.customers.first_name,
          last_name: schema.customers.last_name,
          dob: schema.customers.dob,
          gender: schema.customers.gender,
          marital_status: schema.customers.marital_status,
          primary_mobile: schema.customers.primary_mobile,
          secondary_phone: schema.customers.secondary_phone,
          email: schema.customers.email,
          pan: schema.customers.pan,
          aadhaar: schema.customers.aadhaar,
          address_line1: schema.customers.address_line1,
          address_line2: schema.customers.address_line2,
          city: schema.customers.city,
          state: schema.customers.state,
          postal_code: schema.customers.postal_code,
          country: schema.customers.country,
        })
        .from(schema.accounts)
        .innerJoin(schema.branches, eq(schema.accounts.branch_id, schema.branches.branch_id))
        .innerJoin(schema.customers, eq(schema.accounts.customer_id, schema.customers.customer_id))
        .where(eq(schema.customers.customer_id, query))
        .limit(1);
    }

    if (!rows.length) {
      return res.status(404).json({ error: 'Account or Customer ID not found.' });
    }

    const primaryAcc = rows[0];

    const linkedAccounts = await db
      .select({
        account_number: schema.accounts.account_number,
        account_type: schema.accounts.account_type,
        balance: schema.accounts.balance,
        status: schema.accounts.status,
        branch_name: schema.branches.branch_name,
        ifsc_code: schema.branches.ifsc_code,
      })
      .from(schema.accounts)
      .innerJoin(schema.branches, eq(schema.accounts.branch_id, schema.branches.branch_id))
      .where(eq(schema.accounts.customer_id, primaryAcc.customer_id));

    return res.json({
      account: {
        account_number: primaryAcc.account_number,
        account_type: primaryAcc.account_type,
        balance: primaryAcc.balance,
        min_balance: primaryAcc.min_balance,
        status: primaryAcc.status,
        created_at: primaryAcc.created_at,
        branch: {
          branch_id: primaryAcc.branch_id,
          branch_name: primaryAcc.branch_name,
          ifsc_code: primaryAcc.ifsc_code,
        },
      },
      customer: {
        customer_id: primaryAcc.customer_id,
        first_name: primaryAcc.first_name,
        last_name: primaryAcc.last_name,
        dob: primaryAcc.dob,
        gender: primaryAcc.gender,
        marital_status: primaryAcc.marital_status,
        primary_mobile: primaryAcc.primary_mobile,
        secondary_phone: primaryAcc.secondary_phone,
        email: primaryAcc.email,
        pan: primaryAcc.pan,
        aadhaar: primaryAcc.aadhaar,
        address_line1: primaryAcc.address_line1,
        address_line2: primaryAcc.address_line2,
        city: primaryAcc.city,
        state: primaryAcc.state,
        postal_code: primaryAcc.postal_code,
        country: primaryAcc.country,
        address: `${primaryAcc.address_line1}${primaryAcc.address_line2 ? ', ' + primaryAcc.address_line2 : ''}, ${primaryAcc.city}, ${primaryAcc.state} - ${primaryAcc.postal_code}`,
      },
      linkedAccounts,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Lookup failed.' });
  }
}

export async function getPassbook(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const { accountNumber } = req.params;

    const entries = await db
      .select()
      .from(schema.transactions)
      .where(
        sql`${schema.transactions.from_account} = ${accountNumber} OR ${schema.transactions.to_account} = ${accountNumber}`
      )
      .orderBy(desc(schema.transactions.created_at))
      .limit(100);

    return res.json({ transactions: entries });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Passbook retrieval failed.' });
  }
}