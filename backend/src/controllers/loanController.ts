import { Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { AuthenticatedBankerRequest } from '../middleware/bankerAuth';
import { generateRefNumber } from '../utils/generators';
import {
  calculateMonthlyEmi,
  generateLoanSchedule,
} from '../utils/loanUtils';

export async function getCustomerAccountsForLoan(
  req: AuthenticatedBankerRequest,
  res: Response,
) {
  try {
    const customerId = req.params.customerId?.trim();

    if (!customerId) {
      return res.status(400).json({
        error: 'Customer ID is required.',
      });
    }

    const [customer] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.customer_id, customerId));

    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found.',
      });
    }

    const accounts = await db
      .select({
        account_number: schema.accounts.account_number,
        account_type: schema.accounts.account_type,
        balance: schema.accounts.balance,
        min_balance: schema.accounts.min_balance,
        status: schema.accounts.status,
      })
      .from(schema.accounts)
      .where(
        and(
          eq(schema.accounts.customer_id, customerId),
          eq(schema.accounts.status, 'ACTIVE'),
        ),
      );

    return res.json({
      success: true,
      customer: {
        customer_id: customer.customer_id,
        name: `${customer.first_name} ${customer.last_name}`,
        mobile: customer.primary_mobile,
      },
      accounts,
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      error: error.message || 'Failed to fetch customer accounts.',
    });
  }
}

export async function sanctionLoan(
  req: AuthenticatedBankerRequest,
  res: Response,
) {
  try {
    const {
      disbursal_account_number,
      principal_amount,
      interest_rate,
      tenure_months,
    } = req.body;

    const principal = Number(principal_amount);
    const rate = Number(interest_rate);
    const tenure = Number(tenure_months);

    if (
      !disbursal_account_number ||
      !Number.isFinite(principal) ||
      principal <= 0 ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      !Number.isInteger(tenure) ||
      tenure <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid loan details.',
      });
    }

    const bankerId = req.banker?.banker_id;

    if (!bankerId) {
      return res.status(401).json({
        error: 'Banker authentication required.',
      });
    }

    const monthlyEmi = calculateMonthlyEmi(
      principal,
      rate,
      tenure,
    );

    const result = await db.transaction(async (tx) => {
      const [disbursalAccount] = await tx
        .select()
        .from(schema.accounts)
        .where(
          eq(
            schema.accounts.account_number,
            disbursal_account_number.trim(),
          ),
        )
        .for('update');

      if (!disbursalAccount) {
        throw new Error('Disbursal account not found.');
      }

      if (disbursalAccount.status !== 'ACTIVE') {
        throw new Error('Disbursal account is not active.');
      }

      if (disbursalAccount.branch_id !== req.banker!.branch_id) {
        throw new Error('Account does not belong to banker branch.');
      }

      if (disbursalAccount.account_type === 'LOAN') {
        throw new Error(
          'Loan account cannot be used for loan disbursal.',
        );
      }

      const loanAccountNumber =
        `${disbursalAccount.account_number}_LN`;

      const [existing] = await tx
        .select()
        .from(schema.accounts)
        .where(
          eq(
            schema.accounts.account_number,
            loanAccountNumber,
          ),
        );

      if (existing) {
        throw new Error(
          'A loan already exists for this account.',
        );
      }

      await tx.insert(schema.accounts).values({
        account_number: loanAccountNumber,
        customer_id: disbursalAccount.customer_id,
        branch_id: disbursalAccount.branch_id,
        account_type: 'LOAN',
        balance: '0.00',
        min_balance: '0.00',
        status: 'ACTIVE',
      });

      const totalPayable = Number(
        (monthlyEmi * tenure).toFixed(2),
      );

      const [loan] = await tx
        .insert(schema.loanDetails)
        .values({
          loan_account_number: loanAccountNumber,
          disbursal_account_number:
          disbursalAccount.account_number,
          principal_amount: principal.toFixed(2),
          interest_rate: rate.toFixed(2),
          tenure_months: tenure,
          monthly_emi: monthlyEmi.toFixed(2),
          remaining_amount: totalPayable.toFixed(2),
        })
        .returning();

      const schedule = generateLoanSchedule(
        loanAccountNumber,
        principal,
        rate,
        tenure,
        monthlyEmi,
        new Date(),
      );

      await tx
        .insert(schema.loanSchedules)
        .values(schedule);

      const newBalance = (
        Number(disbursalAccount.balance) + principal
      ).toFixed(2);

      await tx
        .update(schema.accounts)
        .set({
          balance: newBalance,
        })
        .where(
          eq(
            schema.accounts.account_number,
            disbursalAccount.account_number,
          ),
        );

      const [transaction] = await tx
        .insert(schema.transactions)
        .values({
          ref_number: generateRefNumber('DSB'),
          from_account: loanAccountNumber,
          to_account: disbursalAccount.account_number,
          type: 'LOAN_DISBURSAL',
          amount: principal.toFixed(2),
          balance_after: newBalance,
          banker_id: bankerId,
          description:
            `Loan disbursal for ${loanAccountNumber}`,
        })
        .returning();

      return {
        loan,
        transaction,
        disbursal_account_balance: newBalance,
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Loan sanctioned and disbursed successfully.',
      data: result,
    });
  } catch (error: any) {
    console.error('Loan sanction error:', error);

    return res.status(400).json({
      error: error.message || 'Failed to sanction loan.',
    });
  }
}