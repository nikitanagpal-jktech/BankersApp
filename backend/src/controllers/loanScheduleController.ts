import { Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { AuthenticatedBankerRequest } from '../middleware/bankerAuth';
import { generateLoanSchedule } from '../utils/loanUtils';

export async function getLoanSchedule(
  req: AuthenticatedBankerRequest,
  res: Response,
) {
  eq(schema.accounts.branch_id, req.banker!.branch_id)
  try {
    const loanAccountNumber =
      req.params.accountNumber?.trim();

    if (!loanAccountNumber) {
      return res.status(400).json({
        error: 'Loan account number is required.',
      });
    }

    const [loan] = await db
      .select({
        loan_id: schema.loanDetails.loan_id,
        loan_account_number:
          schema.loanDetails.loan_account_number,
        disbursal_account_number:
          schema.loanDetails.disbursal_account_number,
        principal_amount:
          schema.loanDetails.principal_amount,
        interest_rate:
          schema.loanDetails.interest_rate,
        tenure_months:
          schema.loanDetails.tenure_months,
        monthly_emi:
          schema.loanDetails.monthly_emi,
        remaining_amount:
          schema.loanDetails.remaining_amount,
        created_at:
          schema.loanDetails.created_at,

        customer_id:
          schema.customers.customer_id,
        first_name:
          schema.customers.first_name,
        last_name:
          schema.customers.last_name,
        primary_mobile:
          schema.customers.primary_mobile,
      })
      .from(schema.loanDetails)
      .innerJoin(
        schema.accounts,
        eq(
          schema.loanDetails.disbursal_account_number,
          schema.accounts.account_number,
        ),
      )
      .innerJoin(
        schema.customers,
        eq(
          schema.accounts.customer_id,
          schema.customers.customer_id,
        ),
      )
      .where(
        eq(
          schema.loanDetails.loan_account_number,
          loanAccountNumber,
        ),
      );

    if (!loan) {
      return res.status(404).json({
        error: 'Loan account not found.',
      });
    }

    const customerAccounts = await db
      .select({
        account_number:
          schema.accounts.account_number,
        account_type:
          schema.accounts.account_type,
        balance:
          schema.accounts.balance,
        min_balance:
          schema.accounts.min_balance,
        status:
          schema.accounts.status,
      })
      .from(schema.accounts)
      .where(
        and(
          eq(
            schema.accounts.customer_id,
            loan.customer_id,
          ),
          eq(schema.accounts.status, 'ACTIVE'),
        ),
      );

    let schedules = await db
      .select()
      .from(schema.loanSchedules)
      .where(
        eq(
          schema.loanSchedules.loan_account_number,
          loan.loan_account_number,
        ),
      )
      .orderBy(
        schema.loanSchedules.installment_no,
      );

    if (schedules.length === 0) {
      const generated = generateLoanSchedule(
        loan.loan_account_number,
        Number(loan.principal_amount),
        Number(loan.interest_rate),
        loan.tenure_months,
        Number(loan.monthly_emi),
        new Date(loan.created_at),
      );

      try {
        await db
          .insert(schema.loanSchedules)
          .values(generated);
      } catch (error) {
        console.error(
          'Schedule fallback insert:',
          error,
        );
      }

      schedules = await db
        .select()
        .from(schema.loanSchedules)
        .where(
          eq(
            schema.loanSchedules.loan_account_number,
            loan.loan_account_number,
          ),
        )
        .orderBy(
          schema.loanSchedules.installment_no,
        );
    }

    const today = new Date();

    const schedule = schedules.map((item) => {
      let status = item.status;

      if (
        status !== 'PAID' &&
        new Date(item.due_date) < today
      ) {
        status = 'OVERDUE';
      }

      return {
        schedule_id: item.schedule_id,
        loan_account_number:
          item.loan_account_number,
        installment_no: item.installment_no,
        due_date: item.due_date,
        emi_amount: item.emi_amount,
        remaining_amount: item.remaining_amount,
        status,
        paid_at: item.paid_at,
      };
    });

    const nextPayment = schedule.find(
      (item) => item.status !== 'PAID',
    );

    return res.json({
      success: true,

      loan: {
        loan_id: loan.loan_id,
        loan_account_number:
          loan.loan_account_number,
        disbursal_account_number:
          loan.disbursal_account_number,
        principal_amount:
          loan.principal_amount,
        interest_rate:
          loan.interest_rate,
        tenure_months:
          loan.tenure_months,
        monthly_emi:
          loan.monthly_emi,
        remaining_amount:
          loan.remaining_amount,

        customer_id:
          loan.customer_id,

        borrower_name:
          `${loan.first_name} ${loan.last_name}`,
        primary_mobile:
          loan.primary_mobile,
      },

      customerAccounts,

      schedule,

      next_payment: nextPayment ?? null,
    });
  } catch (error: any) {
    console.error(
      'Fetch loan schedule error:',
      error,
    );

    return res.status(500).json({
      error:
        error.message ||
        'Failed to fetch loan schedule.',
    });
  }
}