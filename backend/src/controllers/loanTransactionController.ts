import { Response } from 'express';
import { and, eq, asc } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { AuthenticatedBankerRequest } from '../middleware/bankerAuth';
import { generateRefNumber } from '../utils/generators';

type PaymentMode = 'CASH' | 'ACCOUNT';

export async function payLoanEmi(
  req: AuthenticatedBankerRequest,
  res: Response,
) {
  eq(schema.accounts.branch_id, req.banker!.branch_id)
  try {
    const {
      loan_account_number,
      payment_mode,
      payment_account_number,
      amount,
    } = req.body;

    const paymentAmount = Number(amount);

    if (
      !loan_account_number ||
      !['CASH', 'ACCOUNT'].includes(payment_mode) ||
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      return res.status(400).json({
        error:
          'Valid loan account, payment mode and positive amount are required.',
      });
    }

    const bankerId = req.banker?.banker_id;

    if (!bankerId) {
      return res.status(401).json({
        error: 'Banker authentication required.',
      });
    }

    const result = await db.transaction(async (tx) => {
      const [loan] = await tx
        .select()
        .from(schema.loanDetails)
        .where(
          eq(
            schema.loanDetails.loan_account_number,
            loan_account_number.trim(),
          ),
        )
        .for('update');

      if (!loan) {
        throw new Error('Loan account not found.');
      }

      const [schedule] = await tx
        .select()
        .from(schema.loanSchedules)
        .where(
          and(
            eq(
              schema.loanSchedules.loan_account_number,
              loan.loan_account_number,
            ),
            eq(schema.loanSchedules.status, 'PENDING'),
          ),
        )
        .orderBy(
          asc(schema.loanSchedules.installment_no),
        )
        .limit(1);

      const [overdueSchedule] = await tx
        .select()
        .from(schema.loanSchedules)
        .where(
          and(
            eq(
              schema.loanSchedules.loan_account_number,
              loan.loan_account_number,
            ),
            eq(
              schema.loanSchedules.status,
              'OVERDUE',
            ),
          ),
        )
        .orderBy(
          asc(schema.loanSchedules.installment_no),
        )
        .limit(1);

      const nextSchedule =
        overdueSchedule || schedule;

      if (!nextSchedule) {
        throw new Error(
          'All EMIs have already been paid.',
        );
      }

      const currentRemaining = Number(
        nextSchedule.remaining_amount,
      );

      if (paymentAmount > currentRemaining) {
        throw new Error(
          `Payment cannot exceed the remaining EMI amount of ₹${currentRemaining.toFixed(2)}.`,
        );
      }

      let fromAccount: string | null = null;

      if (payment_mode === 'ACCOUNT') {
        if (!payment_account_number) {
          throw new Error(
            'Payment account number is required.',
          );
        }

        const [paymentAccount] = await tx
          .select()
          .from(schema.accounts)
          .where(
            eq(
              schema.accounts.account_number,
              payment_account_number.trim(),
            ),
          )
          .for('update');

        if (!paymentAccount) {
          throw new Error(
            'Payment account not found.',
          );
        }

        if (paymentAccount.status !== 'ACTIVE') {
          throw new Error(
            'Payment account is not active.',
          );
        }

        if (
          paymentAccount.account_type !==
            'SAVINGS' &&
          paymentAccount.account_type !== 'CURRENT'
        ) {
          throw new Error(
            'EMI can only be paid from a savings or current account.',
          );
        }

        const balance = Number(
          paymentAccount.balance,
        );

        const minBalance = Number(
          paymentAccount.min_balance,
        );

        if (balance - paymentAmount < minBalance) {
          throw new Error(
            `Insufficient funds. Minimum balance of ₹${minBalance.toFixed(2)} must be maintained.`,
          );
        }

        const newBalance = (
          balance - paymentAmount
        ).toFixed(2);

        await tx
          .update(schema.accounts)
          .set({
            balance: newBalance,
          })
          .where(
            eq(
              schema.accounts.account_number,
              paymentAccount.account_number,
            ),
          );

        fromAccount =
          paymentAccount.account_number;
      }

      const remainingEmi = Number(
        (
          currentRemaining - paymentAmount
        ).toFixed(2),
      );

      const fullyPaid = remainingEmi === 0;

      const newScheduleStatus = fullyPaid
        ? 'PAID'
        : 'OVERDUE';

      await tx
        .update(schema.loanSchedules)
        .set({
          remaining_amount:
            remainingEmi.toFixed(2),
          status: newScheduleStatus,
          paid_at: fullyPaid
            ? new Date()
            : null,
        })
        .where(
          eq(
            schema.loanSchedules.schedule_id,
            nextSchedule.schedule_id,
          ),
        );

      const loanRemaining = Math.max(
        0,
        Number(loan.remaining_amount) -
          paymentAmount,
      ).toFixed(2);

      await tx
        .update(schema.loanDetails)
        .set({
          remaining_amount: loanRemaining,
        })
        .where(
          eq(
            schema.loanDetails.loan_account_number,
            loan.loan_account_number,
          ),
        );

      const [transaction] = await tx
        .insert(schema.transactions)
        .values({
          ref_number: generateRefNumber('EMI'),
          from_account: fromAccount,
          to_account:
            loan.loan_account_number,
          type: 'LOAN_EMI',
          amount: paymentAmount.toFixed(2),
          balance_after: loanRemaining,
          banker_id: bankerId,
          description:
            `${payment_mode} EMI payment for installment ${nextSchedule.installment_no}`,
        })
        .returning();

      return {
        transaction,
        installment_no:
          nextSchedule.installment_no,
        emi_amount:
          nextSchedule.emi_amount,
        paid_amount:
          paymentAmount.toFixed(2),
        remaining_amount:
          remainingEmi.toFixed(2),
        status: newScheduleStatus,
        loan_remaining_amount:
          loanRemaining,
      };
    });

    return res.json({
      success: true,
      message:
        result.status === 'PAID'
          ? 'EMI paid successfully.'
          : 'Partial EMI payment recorded. EMI is overdue.',
      data: result,
    });
  } catch (error: any) {
    console.error('Pay EMI error:', error);

    return res.status(400).json({
      error:
        error.message ||
        'Failed to process EMI payment.',
    });
  }
}