export interface BankerProfile {
  banker_id: string;
  employee_id: string;
  name: string;
  branch_id: string;
  branch_name: string;
  ifsc_code: string;
}

export interface CustomerProfile {
  customer_id: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  marital_status: string;
  primary_mobile: string;
  secondary_phone?: string | null;
  email?: string | null;
  pan: string;
  aadhaar: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountSummary {
  account_number: string;
  account_type: string;
  balance: string;
  status?: string;
  created_at: string;
  branch_id?: string;
  branch_name: string;
  ifsc_code: string;
}

export interface TransactionRecord {
  transaction_id: string;
  ref_number: string;
  type: string;
  amount: string;
  balance_after?: string;
  description: string;
  created_at: string;
  from_account?: string | null;
  to_account?: string | null;
  banker_id?: string | null;
  performed_by_banker_id?: string | null;
}

export interface LoanRecord {
  loan_id?: number;
  loan_account_number: string;
  disbursal_account_number: string;
  principal_amount: string;
  interest_rate: string;
  tenure_months: number;
  monthly_emi: string;
  remaining_amount: string;
  created_at?: string;
}

export interface CustomerKYC {
  customer_id: string;
  first_name: string;
  last_name: string;
  dob?: string;
  primary_mobile: string;
  pan: string;
  aadhaar?: string;
  address?: string;
  gender?: string;
  marital_status?: string;
  address_line1?: string;
  address_line2?: string | null;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface LinkedAccount {
  account_number: string;
  account_type: string;
  balance: string;
  status?: string;
}

export interface AccountData extends LinkedAccount {
  min_balance: string;
  branch?: {
    branch_name: string;
    ifsc_code: string;
  };
  created_at: string;
}