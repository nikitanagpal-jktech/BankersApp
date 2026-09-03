import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, sql, desc, or } from 'drizzle-orm';
import { AuthenticatedBankerRequest } from '../middleware/bankerAuth';
import { db } from '../db';
import * as schema from '../db/schema';
import { DecimalMath } from '../utils/math';
import { ENV } from '../config/env';

function generateAccountNumber(): string {
  const prefix = '100';
  const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${prefix}${randomPart}`;
}

function generateRef(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
}

// 1. Authentication
export async function login(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const { employee_id, password } = req.body;
    if (!employee_id || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required.' });
    }

    const [banker] = await db
      .select({
        banker_id: schema.bankers.banker_id,
        employee_id: schema.bankers.employee_id,
        name: schema.bankers.name,
        password_hash: schema.bankers.password_hash,
        branch_id: schema.bankers.branch_id,
        branch_name: schema.branches.branch_name,
        ifsc_code: schema.branches.ifsc_code,
      })
      .from(schema.bankers)
      .innerJoin(schema.branches, eq(schema.bankers.branch_id, schema.branches.branch_id))
      .where(eq(schema.bankers.employee_id, employee_id));

    if (!banker) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, banker.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const payload = {
      banker_id: banker.banker_id,
      employee_id: banker.employee_id,
      branch_id: banker.branch_id,
      branch_name: banker.branch_name,
      ifsc_code: banker.ifsc_code,
      name: banker.name,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '8h' });

    return res.json({
      message: 'Authentication successful',
      token,
      banker: payload,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Login failed.' });
  }
}

export async function getProfile(req: AuthenticatedBankerRequest, res: Response) {
  return res.json({ banker: req.banker });
}

// 2. Customer CreateAccount & Multi-Account Creation
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
      return res.status(400).json({ error: 'Mandatory KYC details or account parameters are missing.' });
    }

    const depositAmount = initial_deposit ? Number(initial_deposit).toFixed(2) : '0.00';
    const minBalance = account_type === 'CURRENT' ? '1000.00' : '500.00';

    if (DecimalMath.isLessThan(depositAmount, minBalance)) {
      return res.status(400).json({
        error: `Initial deposit of ₹${depositAmount} does not meet minimum floor balance ₹${minBalance} for ${account_type} account.`,
      });
    }

    const result = await db.transaction(async (tx) => {
      // 1. Create Master CIF
      const [customer] = await tx
        .insert(schema.customers)
        .values({
          first_name,
          last_name,
          dob,
          gender,
          marital_status,
          primary_mobile,
          secondary_phone,
          email,
          pan: pan.toUpperCase(),
          aadhaar,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country: country || 'India',
        })
        .returning();

      const newAccountNumber = generateAccountNumber();

      // 2. Open Primary Account bound to Banker Branch
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

      // 3. Record Initial Deposit Ledger
      if (Number(depositAmount) > 0) {
        await tx.insert(schema.transactions).values({
          ref_number: generateRef('TXN_INIT'),
          from_account: null,
          to_account: account.account_number,
          type: 'DEPOSIT',
          amount: depositAmount,
          balance_after: depositAmount,
          banker_id: banker.banker_id,
          description: `Initial cash deposit during CreateAccount by ${banker.employee_id}`,
        });
      }

      return { customer, account, ifsc_code: banker.ifsc_code };
    });

    return res.status(201).json({ message: 'Customer CIF and Account initialized successfully.', data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'CreateAccount failed.' });
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
        error: `Deposit ₹${depositAmount} does not meet the minimum balance floor ₹${minBalance}.`,
      });
    }

    const result = await db.transaction(async (tx) => {
      const [customer] = await tx
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.customer_id, String(customer_id)));

      if (!customer) {
        throw new Error('Target Customer CIF does not exist.');
      }

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
          ref_number: generateRef('TXN_INIT'),
          from_account: null,
          to_account: account.account_number,
          type: 'DEPOSIT',
          amount: depositAmount,
          balance_after: depositAmount,
          banker_id: banker.banker_id,
          description: `Initial OTC deposit by ${banker.employee_id}`,
        });
      }

      return { account, customer, ifsc_code: banker.ifsc_code };
    });

    return res.status(201).json({ message: 'Additional account opened successfully.', data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Account opening failed.' });
  }
}

// 3. Account Details Lookup & Passbook
export async function getAccountTransactions(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const { accountNumber } = req.params;

    const rows = await db
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
      .where(eq(schema.accounts.account_number, accountNumber));

    if (!rows.length) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const primaryAcc = rows[0];

    // Linked accounts under same CIF
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

    // Linked Loan Details if applicable
    const loans = await db
      .select()
      .from(schema.loanDetails)
      .where(
        or(
          eq(schema.loanDetails.loan_account_number, primaryAcc.account_number),
          eq(schema.loanDetails.disbursal_account_number, primaryAcc.account_number)
        )
      );

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
        name: `${primaryAcc.first_name} ${primaryAcc.last_name}`,
        dob: primaryAcc.dob,
        gender: primaryAcc.gender,
        marital_status: primaryAcc.marital_status,
        primary_mobile: primaryAcc.primary_mobile,
        secondary_phone: primaryAcc.secondary_phone,
        email: primaryAcc.email,
        pan: primaryAcc.pan,
        aadhaar: primaryAcc.aadhaar,
        address: `${primaryAcc.address_line1}${primaryAcc.address_line2 ? ', ' + primaryAcc.address_line2 : ''}, ${primaryAcc.city}, ${primaryAcc.state} - ${primaryAcc.postal_code}`,
      },
      linkedAccounts,
      loans,
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

// 4. OTC Teller Operations (Row-locked ACID Transactions)
export async function depositCash(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const banker = req.banker!;
    const { account_number, amount, description } = req.body;

    if (!account_number || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid Account Number and positive Amount are required.' });
    }

    const result = await db.transaction(async (tx) => {
      const [acc] = await tx
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.account_number, account_number))
        .for('update');

      if (!acc) throw new Error('Target account not found.');
      if (acc.status !== 'ACTIVE') throw new Error('Target account is not active.');

      const newBalance = DecimalMath.add(acc.balance, amount);

      await tx
        .update(schema.accounts)
        .set({ balance: newBalance })
        .where(eq(schema.accounts.account_number, account_number));

      const [txRecord] = await tx
        .insert(schema.transactions)
        .values({
          ref_number: generateRef('TXN_DEP'),
          from_account: null,
          to_account: account_number,
          type: 'DEPOSIT',
          amount: Number(amount).toFixed(2),
          balance_after: newBalance,
          banker_id: banker.banker_id,
          description: description || `Cash deposit processed by ${banker.employee_id}`,
        })
        .returning();

      return { txRecord, balance: newBalance };
    });

    return res.json({ message: 'Cash deposited successfully.', data: result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Deposit failed.' });
  }
}

export async function withdrawCash(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const banker = req.banker!;
    const { account_number, amount, description } = req.body;

    if (!account_number || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid Account Number and positive Amount are required.' });
    }

    const result = await db.transaction(async (tx) => {
      const [acc] = await tx
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.account_number, account_number))
        .for('update');

      if (!acc) throw new Error('Target account not found.');
      if (acc.status !== 'ACTIVE') throw new Error('Target account is not active.');

      const prospectiveBalance = DecimalMath.subtract(acc.balance, amount);
      if (DecimalMath.isLessThan(prospectiveBalance, acc.min_balance)) {
        throw new Error(
          `Insufficient funds: Withdrawal breaches required minimum balance floor of ₹${acc.min_balance}. Current: ₹${acc.balance}`
        );
      }

      await tx
        .update(schema.accounts)
        .set({ balance: prospectiveBalance })
        .where(eq(schema.accounts.account_number, account_number));

      const [txRecord] = await tx
        .insert(schema.transactions)
        .values({
          ref_number: generateRef('TXN_WTH'),
          from_account: account_number,
          to_account: null,
          type: 'WITHDRAWAL',
          amount: Number(amount).toFixed(2),
          balance_after: prospectiveBalance,
          banker_id: banker.banker_id,
          description: description || `Cash withdrawal processed by ${banker.employee_id}`,
        })
        .returning();

      return { txRecord, balance: prospectiveBalance };
    });

    return res.json({ message: 'Cash withdrawal completed successfully.', data: result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Withdrawal failed.' });
  }
}

export async function transferFunds(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const banker = req.banker!;
    const { from_account, to_account, amount, description } = req.body;

    if (!from_account || !to_account || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid Source, Destination accounts, and positive Amount required.' });
    }

    if (from_account === to_account) {
      return res.status(400).json({ error: 'Source and Destination accounts cannot be the same.' });
    }

    const result = await db.transaction(async (tx) => {
      // 1. Lock Source
      const [src] = await tx
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.account_number, from_account))
        .for('update');

      if (!src) throw new Error('Source account not found.');
      if (src.status !== 'ACTIVE') throw new Error('Source account is inactive.');

      const srcRemaining = DecimalMath.subtract(src.balance, amount);
      if (DecimalMath.isLessThan(srcRemaining, src.min_balance)) {
        throw new Error(
          `Insufficient funds in source account. Minimum floor is ₹${src.min_balance}. Available: ₹${src.balance}`
        );
      }

      // 2. Lock Destination
      const [dest] = await tx
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.account_number, to_account))
        .for('update');

      if (!dest) throw new Error('Destination account not found.');
      if (dest.status !== 'ACTIVE') throw new Error('Destination account is inactive.');

      const destNewBalance = DecimalMath.add(dest.balance, amount);

      // 3. Mutate both
      await tx
        .update(schema.accounts)
        .set({ balance: srcRemaining })
        .where(eq(schema.accounts.account_number, from_account));

      await tx
        .update(schema.accounts)
        .set({ balance: destNewBalance })
        .where(eq(schema.accounts.account_number, to_account));

      const [txRecord] = await tx
        .insert(schema.transactions)
        .values({
          ref_number: generateRef('TXN_TRF'),
          from_account,
          to_account,
          type: 'TRANSFER',
          amount: Number(amount).toFixed(2),
          balance_after: srcRemaining,
          banker_id: banker.banker_id,
          description: description || `Transfer: ${from_account} -> ${to_account} by ${banker.employee_id}`,
        })
        .returning();

      return { txRecord, srcRemaining, destNewBalance };
    });

    return res.json({ message: 'Funds transferred successfully.', data: result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Transfer failed.' });
  }
}

// 4. Branch TransactionsHistory Ledger
export async function getAllTransactions(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const txs = await db
      .select({
        transaction_id: schema.transactions.transaction_id,
        ref_number: schema.transactions.ref_number,
        from_account: schema.transactions.from_account,
        to_account: schema.transactions.to_account,
        type: schema.transactions.type,
        amount: schema.transactions.amount,
        balance_after: schema.transactions.balance_after,
        banker_id: schema.transactions.banker_id,
        description: schema.transactions.description,
        created_at: schema.transactions.created_at,
      })
      .from(schema.transactions)
      .orderBy(desc(schema.transactions.created_at))
      .limit(150);

    return res.json({ transactions: txs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch ledger.' });
  }
}