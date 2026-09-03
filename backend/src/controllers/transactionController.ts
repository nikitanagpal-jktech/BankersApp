import { Response } from 'express';
import { eq, or, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { AuthenticatedBankerRequest } from '../middleware/bankerAuth';

export async function getAllTransactions(
  req: AuthenticatedBankerRequest,
  res: Response
) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 15; // Matches pageSize in TransactionHistory.tsx
    const offset = (page - 1) * limit;

    const transactions = await db
      .select()
      .from(schema.transactions)
      .orderBy(desc(schema.transactions.created_at))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.transactions);

    return res.json({
      success: true,
      transactions,
      pagination: {
        currentPage: page,
        perPage: limit,
        totalPages: Math.ceil(Number(totalResult.count) / limit),
        totalItems: Number(totalResult.count),
      },
    });
  } catch (error: any) {
    console.error('Get all transactions:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch transactions.',
    });
  }
}

export async function getAccountTransactions(
  req: AuthenticatedBankerRequest,
  res: Response
) {
  try {
    const accountNumber = req.params.accountNumber?.trim();

    if (!accountNumber) {
      return res.status(400).json({
        error: 'Account number is required.',
      });
    }

    const transactions = await db
      .select()
      .from(schema.transactions)
      .where(
        or(
          eq(schema.transactions.from_account, accountNumber),
          eq(schema.transactions.to_account, accountNumber)
        )
      )
      .orderBy(desc(schema.transactions.created_at));

    return res.json({
      success: true,
      transactions,
    });
  } catch (error: any) {
    console.error('Get account transactions:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch account transactions.',
    });
  }
}

export async function depositCash(
  req: AuthenticatedBankerRequest,
  res: Response
) {
  try {
    const { account_number, amount, description } = req.body;
    const accountNumber = account_number?.trim();
    const numAmount = Number(amount);

    if (!accountNumber || !Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        error: 'Valid account number and positive amount are required.',
      });
    }

    const bankerId = req.banker?.banker_id;

    if (!bankerId) {
      return res.status(401).json({
        error: 'Banker authentication required.',
      });
    }

    const result = await db.transaction(async (tx) => {
      const [account] = await tx
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.account_number, accountNumber))
        .for('update');

      if (!account) {
        throw new Error('Account not found.');
      }

      if (account.status !== 'ACTIVE') {
        throw new Error('Account is not active.');
      }

      const newBalance = (
        Number(account.balance) + numAmount
      ).toFixed(2);

      await tx
        .update(schema.accounts)
        .set({
          balance: newBalance,
        })
        .where(eq(schema.accounts.account_number, accountNumber));

      const [transaction] = await tx
        .insert(schema.transactions)
        .values({
          ref_number: `DEP_${Date.now()}_${Math.floor(
            1000 + Math.random() * 9000
          )}`,
          from_account: null,
          to_account: accountNumber,
          type: 'DEPOSIT',
          amount: numAmount.toFixed(2),
          balance_after: newBalance,
          banker_id: bankerId,
          description: description?.trim() || 'Counter OTC Cash Deposit',
        })
        .returning();

      return {
        transaction,
        newBalance,
      };
    });

    return res.json({
      success: true,
      message: 'Deposit processed successfully.',
      transaction: result.transaction,
      new_balance: result.newBalance,
    });
  } catch (error: any) {
    console.error('Deposit error:', error);

    return res.status(400).json({
      error: error.message || 'Deposit failed.',
    });
  }
}

export async function withdrawCash(
  req: AuthenticatedBankerRequest,
  res: Response
) {
  try {
    const { account_number, amount, description } = req.body;
    const accountNumber = account_number?.trim();
    const numAmount = Number(amount);

    if (!accountNumber || !Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        error: 'Valid account number and positive amount are required.',
      });
    }

    const bankerId = req.banker?.banker_id;

    if (!bankerId) {
      return res.status(401).json({
        error: 'Banker authentication required.',
      });
    }

    const result = await db.transaction(async (tx) => {
      const [account] = await tx
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.account_number, accountNumber))
        .for('update');

      if (!account) {
        throw new Error('Account not found.');
      }

      if (account.status !== 'ACTIVE') {
        throw new Error('Account is not active.');
      }

      if (account.account_type === 'LOAN') {
        throw new Error('Cash withdrawal is not allowed from a loan account.');
      }

      const currentBalance = Number(account.balance);
      const minBalance = Number(account.min_balance);

      if (currentBalance - numAmount < minBalance) {
        throw new Error(
          `Insufficient funds. Minimum balance of ₹${minBalance.toFixed(
            2
          )} must be maintained.`
        );
      }

      const newBalance = (
        currentBalance - numAmount
      ).toFixed(2);

      await tx
        .update(schema.accounts)
        .set({
          balance: newBalance,
        })
        .where(eq(schema.accounts.account_number, accountNumber));

      const [transaction] = await tx
        .insert(schema.transactions)
        .values({
          ref_number: `WTH_${Date.now()}_${Math.floor(
            1000 + Math.random() * 9000
          )}`,
          from_account: accountNumber,
          to_account: null,
          type: 'WITHDRAWAL',
          amount: numAmount.toFixed(2),
          balance_after: newBalance,
          banker_id: bankerId,
          description: description?.trim() || 'Counter OTC Cash Withdrawal',
        })
        .returning();

      return {
        transaction,
        newBalance,
      };
    });

    return res.json({
      success: true,
      message: 'Withdrawal processed successfully.',
      transaction: result.transaction,
      new_balance: result.newBalance,
    });
  } catch (error: any) {
    console.error('Withdrawal error:', error);

    return res.status(400).json({
      error: error.message || 'Withdrawal failed.',
    });
  }
}

export async function transferFunds(
  req: AuthenticatedBankerRequest,
  res: Response
) {
  try {
    const {
      from_account,
      to_account,
      amount,
      description,
    } = req.body;

    const fromAccount = from_account?.trim();
    const toAccount = to_account?.trim();
    const numAmount = Number(amount);

    if (
      !fromAccount ||
      !toAccount ||
      !Number.isFinite(numAmount) ||
      numAmount <= 0
    ) {
      return res.status(400).json({
        error: 'Valid source, destination and positive amount are required.',
      });
    }

    if (fromAccount === toAccount) {
      return res.status(400).json({
        error: 'Source and destination accounts must be different.',
      });
    }

    const bankerId = req.banker?.banker_id;

    if (!bankerId) {
      return res.status(401).json({
        error: 'Banker authentication required.',
      });
    }

    const result = await db.transaction(async (tx) => {
      const [sender] = await tx
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.account_number, fromAccount))
        .for('update');

      const [receiver] = await tx
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.account_number, toAccount))
        .for('update');

      if (!sender) {
        throw new Error('Source account not found.');
      }

      if (!receiver) {
        throw new Error('Destination account not found.');
      }

      if (sender.status !== 'ACTIVE') {
        throw new Error('Source account is not active.');
      }

      if (receiver.status !== 'ACTIVE') {
        throw new Error('Destination account is not active.');
      }

      if (sender.account_type === 'LOAN') {
        throw new Error('Loan account cannot be used as a transfer source.');
      }

      const senderBalance = Number(sender.balance);
      const minBalance = Number(sender.min_balance);

      if (senderBalance - numAmount < minBalance) {
        throw new Error(
          `Insufficient funds. Minimum balance of ₹${minBalance.toFixed(
            2
          )} must be maintained.`
        );
      }

      const newSenderBalance = (
        senderBalance - numAmount
      ).toFixed(2);

      const newReceiverBalance = (
        Number(receiver.balance) + numAmount
      ).toFixed(2);

      await tx
        .update(schema.accounts)
        .set({
          balance: newSenderBalance,
        })
        .where(eq(schema.accounts.account_number, fromAccount));

      await tx
        .update(schema.accounts)
        .set({
          balance: newReceiverBalance,
        })
        .where(eq(schema.accounts.account_number, toAccount));

      const [transaction] = await tx
        .insert(schema.transactions)
        .values({
          ref_number: `TRF_${Date.now()}_${Math.floor(
            1000 + Math.random() * 9000
          )}`,
          from_account: fromAccount,
          to_account: toAccount,
          type: 'TRANSFER',
          amount: numAmount.toFixed(2),
          balance_after: newSenderBalance,
          banker_id: bankerId,
          description:
            description?.trim() ||
            `Transfer from ${fromAccount} to ${toAccount}`,
        })
        .returning();

      return {
        transaction,
        senderBalance: newSenderBalance,
        receiverBalance: newReceiverBalance,
      };
    });

    return res.json({
      success: true,
      message: 'Funds transferred successfully.',
      transaction: result.transaction,
      sender_balance: result.senderBalance,
      receiver_balance: result.receiverBalance,
    });
  } catch (error: any) {
    console.error('Transfer error:', error);

    return res.status(400).json({
      error: error.message || 'Transfer failed.',
    });
  }
}