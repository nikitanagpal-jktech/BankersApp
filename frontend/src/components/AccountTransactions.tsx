import React, { useState, useEffect } from 'react';
import { FileText, User, ChevronLeft, ChevronRight, ArrowLeft, CreditCard, Eye, EyeOff } from 'lucide-react';
import { AccountData, CustomerKYC, LinkedAccount, TransactionRecord } from '../types';
import { formatDateDMY } from '../utils/formatters';

interface Props {
  initialAccount?: string;
  onBack?: () => void;
}

export const AccountTransactions: React.FC<Props> = ({ initialAccount = '', onBack }) => {
  const [, setAccountNumber] = useState(initialAccount);
  const [accountData, setAccountData] = useState<{
    account: AccountData;
    customer: CustomerKYC;
    linkedAccounts: LinkedAccount[];
  } | null>(null);
  const [passbook, setPassbook] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showBalance, setShowBalance] = useState(false); // Eye toggle state
  const pageSize = 10;

  const handleFetchDetails = async (target: string) => {
    if (!target.trim()) return;
    setLoading(true);
    setError('');
    setCurrentPage(1);

    try {
      const res = await fetch(`/api/banker/accounts/${target.trim()}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Account not found');

      setAccountData(data);

      const pbRes = await fetch(`/api/banker/accounts/${target.trim()}/passbook`, { credentials: 'include' });
      const pbData = await pbRes.json();
      setPassbook(pbData.transactions || []);
    } catch (err: any) {
      setError(err.message);
      setAccountData(null);
      setPassbook([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialAccount) {
      setAccountNumber(initialAccount);
      handleFetchDetails(initialAccount);
    }
  }, [initialAccount]);

  const totalPages = Math.ceil(passbook.length / pageSize) || 1;
  const paginatedPassbook = passbook.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Top Header & Back Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {onBack ? (
          <button
            onClick={onBack}
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        ) : <div />}
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Account 360 Overview</div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {loading && !accountData ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading account profile...</div>
      ) : accountData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* SECTION 1: ACCOUNT & CUSTOMER INFORMATION CARDS (TOP) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

            {/* Card 1: Account Financial & Meta Details */}
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontWeight: 700, fontSize: '14px' }}>
                  <CreditCard size={18} /> Account Summary
                </div>
                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                  {accountData.account.account_type}
                </span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>AVAILABLE BALANCE</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px', letterSpacing: '1px' }}>
                    {showBalance ? `₹${Number(accountData.account.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹XXXX.XX'}
                  </div>
                </div>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  style={{
                    background: '#e2e8f0',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#334155',
                  }}
                  title={showBalance ? "Hide Balance" : "Show Balance"}
                >
                  {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Account Number:</span>
                  <strong style={{ color: '#0f172a' }}>{accountData.account.account_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Branch Name:</span>
                  <strong style={{ color: '#0f172a' }}>{accountData.account.branch?.branch_name || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>IFSC Code:</span>
                  <strong style={{ color: '#0f172a' }}>{accountData.account.branch?.ifsc_code || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Minimum Floor Balance:</span>
                  <strong style={{ color: '#0f172a' }}>₹{accountData.account.min_balance}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Created Date:</span>
                  <strong style={{ color: '#0f172a' }}>{formatDateDMY(accountData.account.created_at)}</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Customer Demographics & KYC Details */}
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
                <User size={18} /> Customer KYC Profile
              </div>

              <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>CIF ID:</span>
                  <strong style={{ color: '#2563eb' }}>{accountData.customer.customer_id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Full Name:</span>
                  <strong style={{ color: '#0f172a' }}>{accountData.customer.first_name} {accountData.customer.last_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Date of Birth:</span>
                  <strong style={{ color: '#0f172a' }}>{formatDateDMY(accountData.customer.dob)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Primary Mobile:</span>
                  <strong style={{ color: '#0f172a' }}>{accountData.customer.primary_mobile}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>PAN Number:</span>
                  <strong style={{ color: '#0f172a' }}>{accountData.customer.pan}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Address:</span>
                  <strong style={{ color: '#0f172a', textAlign: 'right', maxWidth: '180px' }}>{accountData.customer.address}</strong>
                </div>
              </div>
            </div>

          </div>

          {/* Linked Accounts Quick Switcher (if any) */}
          {accountData.linkedAccounts?.length > 1 && (
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '10px' }}>
                OTHER LINKED ACCOUNTS UNDER SAME CIF (CLICK TO SWITCH)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {accountData.linkedAccounts.map((acc) => (
                  <div
                    key={acc.account_number}
                    onClick={() => {
                      setAccountNumber(acc.account_number);
                      handleFetchDetails(acc.account_number);
                    }}
                    style={{
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      border: acc.account_number === accountData.account.account_number ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{acc.account_number}</div>
                      <div style={{ color: '#64748b', fontSize: '10px' }}>{acc.account_type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: ACCOUNT TRANSACTION HISTORY PASSBOOK (BOTTOM) */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FileText size={18} color="#2563eb" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Account Transaction History & Passbook</h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '12px' }}>Ref / Date</th>
                    <th style={{ padding: '12px' }}>Type</th>
                    <th style={{ padding: '12px' }}>Description</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPassbook.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        No transactions recorded for this account.
                      </td>
                    </tr>
                  ) : (
                    paginatedPassbook.map((tx) => {
                      const isCredit = tx.to_account === accountData.account.account_number;
                      return (
                        <tr key={tx.transaction_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{tx.ref_number}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{formatDateDMY(tx.created_at)}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#e2e8f0', color: '#334155' }}>
                              {tx.type}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#475569', maxWidth: '280px' }}>{tx.description}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: isCredit ? '#059669' : '#dc2626' }}>
                            {isCredit ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                            {showBalance ? `₹${Number(tx.balance_after).toFixed(2)}` : '₹XXXX.XX'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Passbook Pagination Controls */}
            {passbook.length > pageSize && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, passbook.length)} of {passbook.length} entries
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      background: '#fff',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      background: '#fff',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : null}
    </div>
  );
};