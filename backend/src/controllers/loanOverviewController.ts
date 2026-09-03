import { Response } from 'express';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { AuthenticatedBankerRequest } from '../middleware/bankerAuth';

export async function getAllLoans(
  req: AuthenticatedBankerRequest,
  res: Response,
) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10; // Matches your standard page size
    const offset = (page - 1) * limit;
    const bankerBranchId = req.banker!.branch_id;

    const loans = await db
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
      .where(eq(schema.accounts.branch_id, bankerBranchId)) // Properly chained here!
      .orderBy(desc(schema.loanDetails.created_at))
      .limit(limit)
      .offset(offset);

    // Fetch total count for pagination metadata
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.loanDetails)
      .innerJoin(
        schema.accounts,
        eq(
          schema.loanDetails.disbursal_account_number,
          schema.accounts.account_number,
        ),
      )
      .where(eq(schema.accounts.branch_id, bankerBranchId));

    return res.json({
      success: true,
      loans: loans.map((loan) => ({
        ...loan,
        borrower_name:
          `${loan.first_name} ${loan.last_name}`,
      })),
      pagination: {
        currentPage: page,
        perPage: limit,
        totalPages: Math.ceil(Number(totalResult.count) / limit) || 1,
        totalItems: Number(totalResult.count),
      },
    });
  } catch (error: any) {
    console.error('Get all loans:', error);

    return res.status(500).json({
      error: error.message || 'Failed to fetch loans.',
    });
  }
}