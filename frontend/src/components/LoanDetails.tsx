import { useEffect, useState } from 'react';
import {
  Landmark,
  Search,
  Eye,
  AlertCircle,
  CheckCircle,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useBankerAuth } from '../context/BankerAuthContext';
import { LoanRecord } from '../types';

interface Loan extends LoanRecord {
  customer_id: string;
  borrower_name: string;
}

interface ScheduleItem {
  schedule_id: number;
  installment_no: number;
  due_date: string;
  emi_amount: string;
  remaining_amount: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paid_at?: string | null;
}

interface CustomerAccount {
  account_number: string;
  account_type: string;
  balance: string;
}

interface LoanScheduleResponse {
  loan: Loan;
  schedule: ScheduleItem[];
  customerAccounts: CustomerAccount[];
  error?: string;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const LoanDetails = () => {
  const { logout } = useBankerAuth();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  

  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([]);

  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [paying, setPaying] = useState(false);

  const [activeInstallment, setActiveInstallment] =
    useState<ScheduleItem | null>(null);

  const [paymentAmount, setPaymentAmount] = useState('');

  const [paymentMode, setPaymentMode] =
    useState<'CASH' | 'ACCOUNT'>('CASH');

  const [selectedAccountNum, setSelectedAccountNum] = useState('');

  const fetchAllLoans = async (page: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/banker/loans/all?page=${page}`, {
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        logout('Session expired. Please log in again.');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load loans.');
      }

      const loanRecords = data.loans || data.data || [];
      setLoans(loanRecords);

      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalItems(data.pagination.totalItems || loanRecords.length);
      } else {
        setTotalPages(1);
        setTotalItems(loanRecords.length);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load loans.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLoans(currentPage);
  }, [currentPage]);

  const fetchLoanSchedule = async (loan: Loan, showLoader = true) => {
    if (showLoader) {
      setScheduleLoading(true);
    }

    try {
      const res = await fetch(
        `/api/banker/loans/account/${loan.loan_account_number}/schedule`,
        {
          credentials: 'include',
        }
      );

      const data: LoanScheduleResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch loan schedule.');
      }

      setSelectedLoan(data.loan || loan);
      setSchedule(data.schedule || []);
      setCustomerAccounts(data.customerAccounts || []);

      if (data.customerAccounts?.length > 0 && !selectedAccountNum) {
        setSelectedAccountNum(
          data.customerAccounts[0].account_number
        );
      }

      return data;
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch loan schedule.'));
      setSchedule([]);
      throw err;
    } finally {
      if (showLoader) {
        setScheduleLoading(false);
      }
    }
  };

  const handleSelectLoan = async (loan: Loan) => {
    setSelectedLoan(loan);
    setError('');
    setSuccessMsg('');
    setActiveInstallment(null);
    setPaymentAmount('');
    setSelectedAccountNum('');

    await fetchLoanSchedule(loan);
  };

  const handleStartPayment = (item: ScheduleItem) => {
    setError('');
    setSuccessMsg('');

    setActiveInstallment(item);
    setPaymentAmount(item.remaining_amount || item.emi_amount);
    setPaymentMode('CASH');

    if (customerAccounts.length > 0) {
      setSelectedAccountNum(customerAccounts[0].account_number);
    }
  };

  const handleCancelPayment = () => {
    if (paying) return;

    setActiveInstallment(null);
    setPaymentAmount('');
    setPaymentMode('CASH');
  };

  const handleExecutePayment = async () => {
    if (!selectedLoan || !activeInstallment) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (amount > Number(activeInstallment.remaining_amount || activeInstallment.emi_amount)) {
      setError('Payment amount cannot be greater than the remaining EMI amount.');
      return;
    }

    if (
      paymentMode === 'ACCOUNT' &&
      !selectedAccountNum
    ) {
      setError('Please select a source account.');
      return;
    }

    setPaying(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/banker/loans/pay-emi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          loan_account_number:
            selectedLoan.loan_account_number,
          payment_mode: paymentMode,
          payment_account_number:
            paymentMode === 'ACCOUNT'
              ? selectedAccountNum
              : null,
          amount: paymentAmount,
          schedule_id: activeInstallment.schedule_id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'EMI payment failed.');
      }

      setSuccessMsg('EMI payment processed successfully.');

      setActiveInstallment(null);
      setPaymentAmount('');

      await fetchLoanSchedule(selectedLoan, false);
      await fetchAllLoans(currentPage);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'EMI payment failed.'));
    } finally {
      setPaying(false);
    }
  };

  const firstUnpaidIndex = schedule.findIndex(
    (item) => item.status !== 'PAID'
  );

  const filteredLoans = loans.filter((loan) => {
    const search = searchTerm.toLowerCase();

    return (
      loan.loan_account_number
        ?.toLowerCase()
        .includes(search) ||
      loan.disbursal_account_number
        ?.toLowerCase()
        .includes(search) ||
      loan.borrower_name
        ?.toLowerCase()
        .includes(search) ||
      loan.customer_id
        ?.toLowerCase()
        .includes(search)
    );
  });

  const formatMoney = (value: string | number) =>
    Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #dbe4f0',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              background: '#eff6ff',
              padding: '8px',
              borderRadius: '8px',
            }}
          >
            <Landmark size={22} color="#2563eb" />
          </div>

          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              Branch Loan Accounts
            </h2>

            <div
              style={{
                fontSize: '12px',
                color: '#64748b',
              }}
            >
              Complete directory of sanctioned loans and repayment schedules ({totalItems} total)
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            width: '300px',
          }}
        >
          <Search
            size={16}
            color="#64748b"
            style={{
              position: 'absolute',
              left: '12px',
              top: '12px',
            }}
          />

          <input
            type="text"
            placeholder="Search CIF, account, or borrower..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {error && !selectedLoan && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            color: '#64748b',
          }}
        >
          Loading active loans...
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '2px solid #e2e8f0',
                    color: '#475569',
                  }}
                >
                  <th style={{ padding: '12px 16px' }}>Loan Account</th>
                  <th style={{ padding: '12px 16px' }}>Customer CIF</th>
                  <th style={{ padding: '12px 16px' }}>Borrower Name</th>
                  <th style={{ padding: '12px 16px' }}>Principal</th>
                  <th style={{ padding: '12px 16px' }}>Monthly EMI</th>
                  <th style={{ padding: '12px 16px' }}>Remaining Balance</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: 'center',
                        padding: '30px',
                        color: '#94a3b8',
                      }}
                    >
                      No active loans found.
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => (
                    <tr
                      key={loan.loan_id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <td
                        style={{
                          padding: '14px 16px',
                          fontWeight: 700,
                          color: '#2563eb',
                        }}
                      >
                        {loan.loan_account_number}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          fontWeight: 600,
                          color: '#475569',
                        }}
                      >
                        {loan.customer_id || '-'}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#0f172a',
                          fontWeight: 600,
                        }}
                      >
                        {loan.borrower_name || '-'}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        ₹{formatMoney(loan.principal_amount)}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#d97706',
                          fontWeight: 700,
                        }}
                      >
                        ₹{formatMoney(loan.monthly_emi)}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#16a34a',
                          fontWeight: 700,
                        }}
                      >
                        ₹{formatMoney(loan.remaining_amount)}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          textAlign: 'center',
                        }}
                      >
                        <button
                          onClick={() => handleSelectLoan(loan)}
                          style={{
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={14} />
                          View Schedule
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Showing page {currentPage} of {totalPages} ({totalItems} total loans)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1 || loading}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  background: currentPage === 1 ? '#f8fafc' : '#fff',
                  color: currentPage === 1 ? '#94a3b8' : '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0 || loading}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  background: currentPage === totalPages || totalPages === 0 ? '#f8fafc' : '#fff',
                  color: currentPage === totalPages || totalPages === 0 ? '#94a3b8' : '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {selectedLoan && (
        <div
          style={{
            position: 'fixed',
            top: '64px',
            right: 0,
            bottom: 0,
            left: '225px', // Shifts modal right to completely clear your sidebar
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '27px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '850px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
              position: 'relative',
              maxHeight: 'calc(100vh - 120px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                }}
              >
                Loan Account & Repayment Schedule
              </h3>

              <button
                onClick={() => {
                  setSelectedLoan(null);
                  setActiveInstallment(null);
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                {error}
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#065f46',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                {successMsg}
              </div>
            )}

            <div
              style={{
                background: '#0f172a',
                padding: '16px',
                borderRadius: '10px',
                color: '#ffffff',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Loan Account Number
              </div>

              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#38bdf8',
                  marginBottom: '10px',
                }}
              >
                {selectedLoan.loan_account_number}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#cbd5e1',
                  borderTop: '1px solid #1e293b',
                  paddingTop: '8px',
                }}
              >
                <span>
                  Customer CIF:{' '}
                  <strong style={{ color: '#38bdf8' }}>
                    {selectedLoan.customer_id || '-'}
                  </strong>
                </span>

                <span>
                  Borrower:{' '}
                  <strong style={{ color: '#ffffff' }}>
                    {selectedLoan.borrower_name || '-'}
                  </strong>
                </span>

                <span>
                  Remaining:{' '}
                  <strong style={{ color: '#4ade80' }}>
                    ₹{formatMoney(selectedLoan.remaining_amount)}
                  </strong>
                </span>
              </div>
            </div>

            {activeInstallment && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 12px',
                  }}
                >
                  Pay Installment #{activeInstallment.installment_no}
                </h4>

                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'end',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#475569',
                        marginBottom: '4px',
                      }}
                    >
                      PAYMENT AMOUNT
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) =>
                        setPaymentAmount(e.target.value)
                      }
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: '11px',
                      color: '#64748b',
                      paddingBottom: '9px',
                    }}
                  >
                    Remaining for EMI: ₹{formatMoney(activeInstallment.remaining_amount)}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '12px',
                    fontSize: '13px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="radio"
                      checked={paymentMode === 'CASH'}
                      onChange={() => setPaymentMode('CASH')}
                    />
                    Pay via Cash
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="radio"
                      checked={paymentMode === 'ACCOUNT'}
                      onChange={() => setPaymentMode('ACCOUNT')}
                    />
                    Pay from Account
                  </label>
                </div>

                {paymentMode === 'ACCOUNT' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#475569',
                        marginBottom: '4px',
                      }}
                    >
                      SOURCE ACCOUNT
                    </label>

                    <select
                      value={selectedAccountNum}
                      onChange={(e) =>
                        setSelectedAccountNum(e.target.value)
                      }
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        background: '#fff',
                      }}
                    >
                      {customerAccounts.map((account) => (
                        <option
                          key={account.account_number}
                          value={account.account_number}
                        >
                          {account.account_number} (
                          {account.account_type}) - Balance: ₹
                          {formatMoney(account.balance)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                  }}
                >
                  <button
                    onClick={handleExecutePayment}
                    disabled={paying}
                    style={{
                      background: '#059669',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: paying ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {paying ? 'Processing...' : 'Confirm Payment'}
                  </button>

                  <button
                    onClick={handleCancelPayment}
                    disabled={paying}
                    style={{
                      background: '#e2e8f0',
                      color: '#334155',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: paying ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Repayment Schedule hidden when activeInstallment is open */}
            {!activeInstallment && (
              <>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '10px',
                  }}
                >
                  Repayment Schedule
                </h4>

                <div
                  style={{
                    overflowY: 'auto',
                    maxHeight: '360px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                >
                  {scheduleLoading ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '30px',
                        color: '#64748b',
                      }}
                    >
                      Loading schedule...
                    </div>
                  ) : (
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        textAlign: 'left',
                        fontSize: '12px',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            color: '#475569',
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                          }}
                        >
                          <th style={{ padding: '10px 12px' }}>#</th>
                          <th style={{ padding: '10px 12px' }}>Due Date</th>
                          <th style={{ padding: '10px 12px' }}>EMI Amount</th>
                          <th style={{ padding: '10px 12px' }}>Remaining Amount</th>
                          <th style={{ padding: '10px 12px' }}>Status</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {schedule.map((item, index) => {
                          const isNextPayment = index === firstUnpaidIndex;

                          return (
                            <tr
                              key={item.schedule_id}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                              }}
                            >
                              <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                                {item.installment_no}
                              </td>
                              <td style={{ padding: '10px 12px' }}>{item.due_date}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                                ₹{formatMoney(item.emi_amount)}
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#16a34a' }}>
                                ₹{formatMoney(item.remaining_amount)}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                {item.status === 'PAID' && (
                                  <span
                                    style={{
                                      background: '#dcfce7',
                                      color: '#166534',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <CheckCircle size={10} /> PAID
                                  </span>
                                )}

                                {item.status === 'OVERDUE' && (
                                  <span
                                    style={{
                                      background: '#fee2e2',
                                      color: '#991b1b',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <AlertTriangle size={10} /> OVERDUE
                                  </span>
                                )}

                                {item.status === 'PENDING' && (
                                  <span
                                    style={{
                                      background: '#fef9c3',
                                      color: '#854d0e',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                    }}
                                  >
                                    PENDING
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                {isNextPayment && !activeInstallment && (
                                  <button
                                    onClick={() => handleStartPayment(item)}
                                    style={{
                                      background: '#059669',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '5px 10px',
                                      borderRadius: '4px',
                                      fontWeight: 700,
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Pay EMI
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};