import {
  pgTable,
  index,
  serial,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  date,
  pgSequence,
  unique,
} from 'drizzle-orm/pg-core';

import { relations, sql } from 'drizzle-orm';

// sequences
export const customerIdSeq = pgSequence('customer_id_seq', {
  startWith: 1,
  increment: 1,
});

export const branchIdSeq = pgSequence('branch_id_seq', {
  startWith: 1,
  increment: 1,
});

export const bankerIdSeq = pgSequence('banker_id_seq', {
  startWith: 1,
  increment: 1,
});

// branches
export const branches = pgTable('branches', {
  branch_id: varchar('branch_id', { length: 20 }).primaryKey(),
  branch_name: varchar('branch_name', { length: 100 }).notNull(),
  ifsc_code: varchar('ifsc_code', { length: 20 }).notNull().unique(),
  address: text('address').notNull(),
});

// bankers
export const bankers = pgTable('bankers', {
  banker_id: varchar('banker_id', { length: 20 }).primaryKey(),
  employee_id: varchar('employee_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  branch_id: varchar('branch_id', { length: 20 })
    .notNull()
    .references(() => branches.branch_id),
});

// customers
export const customers = pgTable('customers', {
  customer_id: varchar('customer_id', { length: 30 })
    .primaryKey()
    .default(
      sql`'CUST' || lpad(nextval('customer_id_seq')::text, 6, '0')`,
    ),

  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  dob: date('dob').notNull(),
  gender: varchar('gender', { length: 20 }),
  marital_status: varchar('marital_status', { length: 20 }),
  primary_mobile: varchar('primary_mobile', { length: 15 }).notNull().unique(),
  secondary_phone: varchar('secondary_phone', { length: 15 }),
  email: varchar('email', { length: 255 }),
  pan: varchar('pan', { length: 10 }).notNull().unique(),
  aadhaar: varchar('aadhaar', { length: 50 }).notNull().unique(),
  address_line1: varchar('address_line1', { length: 255 }).notNull(),
  address_line2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  postal_code: varchar('postal_code', { length: 10 }).notNull(),
  country: varchar('country', { length: 100 }).default('India').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_customers_created').on(table.created_at),
]);

// accounts
export const accounts = pgTable('accounts', {
  account_number: varchar('account_number', { length: 30 }).primaryKey(),

  customer_id: varchar('customer_id', { length: 30 })
    .notNull()
    .references(() => customers.customer_id),

  branch_id: varchar('branch_id', { length: 20 })
    .notNull()
    .references(() => branches.branch_id),

  account_type: varchar('account_type', { length: 20 }).notNull(),

  balance: decimal('balance', {
    precision: 15,
    scale: 2,
  })
    .default('0.00')
    .notNull(),

  min_balance: decimal('min_balance', {
    precision: 15,
    scale: 2,
  })
    .default('500.00')
    .notNull(),

  status: varchar('status', { length: 20 })
    .default('ACTIVE')
    .notNull(),

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_accounts_customer').on(table.customer_id),
  index('idx_accounts_type').on(table.account_type),
]);

// loan details
export const loanDetails = pgTable('loan_details', {
  loan_id: serial('loan_id').primaryKey(),

  loan_account_number: varchar('loan_account_number', { length: 30 })
    .notNull()
    .unique()
    .references(() => accounts.account_number),

  disbursal_account_number: varchar('disbursal_account_number', {
    length: 30,
  })
    .notNull()
    .references(() => accounts.account_number),

  principal_amount: decimal('principal_amount', {
    precision: 15,
    scale: 2,
  }).notNull(),

  interest_rate: decimal('interest_rate', {
    precision: 5,
    scale: 2,
  }).notNull(),

  tenure_months: integer('tenure_months').notNull(),

  monthly_emi: decimal('monthly_emi', {
    precision: 15,
    scale: 2,
  }).notNull(),

  remaining_amount: decimal('remaining_amount', {
    precision: 15,
    scale: 2,
  }).notNull(),

  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const loans = loanDetails;

// loan schedules
export const loanSchedules = pgTable(
  'loan_schedules',
  {
    schedule_id: serial('schedule_id').primaryKey(),

    loan_account_number: varchar('loan_account_number', {
      length: 30,
    })
      .notNull()
      .references(() => loanDetails.loan_account_number, {
        onDelete: 'cascade',
      }),

    installment_no: integer('installment_no').notNull(),

    due_date: date('due_date').notNull(),

    principal_component: decimal('principal_component', {
      precision: 15,
      scale: 2,
    }).notNull(),

    interest_component: decimal('interest_component', {
      precision: 15,
      scale: 2,
    }).notNull(),

    emi_amount: decimal('emi_amount', {
      precision: 15,
      scale: 2,
    }).notNull(),

    remaining_amount: decimal('remaining_amount', {
      precision: 15,
      scale: 2,
    }).notNull(),

    status: varchar('status', {
      length: 20,
    })
      .default('PENDING')
      .notNull(),

    paid_at: timestamp('paid_at'),
  },
  (table) => [
    unique('loan_schedule_installment_unique').on(
      table.loan_account_number,
      table.installment_no,
    ),
  ],
);

// transactions
export const transactions = pgTable('transactions', {
  transaction_id: serial('transaction_id').primaryKey(),

  ref_number: varchar('ref_number', {
    length: 50,
  })
    .notNull()
    .unique(),

  from_account: varchar('from_account', {
    length: 30,
  }).references(() => accounts.account_number),

  to_account: varchar('to_account', {
    length: 30,
  }).references(() => accounts.account_number),

  type: varchar('type', {
    length: 30,
  }).notNull(),

  amount: decimal('amount', {
    precision: 15,
    scale: 2,
  }).notNull(),

  balance_after: decimal('balance_after', {
    precision: 15,
    scale: 2,
  }).notNull(),

  banker_id: varchar('banker_id', {
    length: 20,
  })
    .notNull()
    .references(() => bankers.banker_id),

  description: text('description'),

  created_at: timestamp('created_at').defaultNow().notNull(),
});

// relations
export const branchesRelations = relations(branches, ({ many }) => ({
  bankers: many(bankers),
  accounts: many(accounts),
}));

export const bankersRelations = relations(bankers, ({ one, many }) => ({
  branch: one(branches, {
    fields: [bankers.branch_id],
    references: [branches.branch_id],
  }),
  transactions: many(transactions),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  customer: one(customers, {
    fields: [accounts.customer_id],
    references: [customers.customer_id],
  }),

  branch: one(branches, {
    fields: [accounts.branch_id],
    references: [branches.branch_id],
  }),

  outgoingTxns: many(transactions, {
    relationName: 'fromAccount',
  }),

  incomingTxns: many(transactions, {
    relationName: 'toAccount',
  }),
}));

export const loanDetailsRelations = relations(
  loanDetails,
  ({ one, many }) => ({
    loanAccount: one(accounts, {
      fields: [loanDetails.loan_account_number],
      references: [accounts.account_number],
    }),

    disbursalAccount: one(accounts, {
      fields: [loanDetails.disbursal_account_number],
      references: [accounts.account_number],
    }),

    schedules: many(loanSchedules),
  }),
);

export const loanSchedulesRelations = relations(
  loanSchedules,
  ({ one }) => ({
    loan: one(loanDetails, {
      fields: [loanSchedules.loan_account_number],
      references: [loanDetails.loan_account_number],
    }),
  }),
);

export const transactionsRelations = relations(
  transactions,
  ({ one }) => ({
    senderAccount: one(accounts, {
      fields: [transactions.from_account],
      references: [accounts.account_number],
      relationName: 'fromAccount',
    }),

    receiverAccount: one(accounts, {
      fields: [transactions.to_account],
      references: [accounts.account_number],
      relationName: 'toAccount',
    }),

    banker: one(bankers, {
      fields: [transactions.banker_id],
      references: [bankers.banker_id],
    }),
  }),
);