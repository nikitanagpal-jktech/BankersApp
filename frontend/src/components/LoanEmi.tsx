import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Search, ArrowRight } from 'lucide-react';
import { useBankerAuth } from '../context/BankerAuthContext';

export const LoanEmi: React.FC = () => {
  const { logout } = useBankerAuth();
  const [loanAccountNumber, setLoanAccountNumber] = useState('');
  const [loanData, setLoanData] = useState<any | null>(null);
  const [customerAccounts, setCustomerAccounts] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  
  // Payment states
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ACCOUNT'>('CASH');
  const [selectedAccountNum, setSelectedAccountNum] = useState('');
  const [amount, setAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any | null>(null);

  const handleFetchLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanAccountNumber.trim()) return;

    setLoading(true);
    setError('');
    setSuccessData(null);
    setLoanData(null);
    setSchedule([]);

    try {
      const res = await fetch(`/api/banker/loans/account/${loanAccountNumber.trim()}/schedule`, {
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        logout('Session expired. Please log in again.');
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Loan account not found.');

      setLoanData(data.loan);
      setCustomerAccounts(data.customerAccounts || []);
      setSchedule(data.schedule || []);

      // Find the first unpaid/pending EMI to set default amount
      const nextUnpaid = (data.schedule || []).find((item: any) => item.status !== 'PAID');
      setAmount(nextUnpaid ? nextUnpaid.remaining_amount : data.loan.monthly_emi || '');

      if (data.customerAccounts && data.customerAccounts.length > 0) {
        setSelectedAccountNum(data.customerAccounts[0].account_number);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch loan details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayEmi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanData) return;
    setError('');
    setPaying(true);

    // Find the active schedule ID for the current unpaid installment
    const activeInstallment = schedule.find((item: any) => item.status !== 'PAID');

    try {
      const res = await fetch('/api/banker/loans/pay-emi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_account_number: loanData.loan_account_number,
          payment_mode: paymentMode,
          payment_account_number: paymentMode === 'ACCOUNT' ? selectedAccountNum : null,
          amount,
          schedule_id: activeInstallment ? activeInstallment.schedule_id : undefined,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'EMI payment failed.');

      setSuccessData(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to process EMI payment.');
    } finally {
      setPaying(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setLoanData(null);
    setLoanAccountNumber('');
    setAmount('');
    setSchedule([]);
  };

  // Get current active installment remaining amount
  const currentInstallment = schedule.find((item: any) => item.status !== 'PAID');
  const currentEmiRemaining = currentInstallment ? currentInstallment.remaining_amount : 0;

  return (
    <div style={{ background: '#ffffff', border: '1px solid #dbe4f0', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px' }}>
          <CreditCard size={24} color="#2563eb" />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Process Loan EMI Payment</h2>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Collect EMI via Cash or debit customer savings/current account</div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Step 1: Look up Loan Account */}
      <form onSubmit={handleFetchLoan} style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>LOAN ACCOUNT NUMBER</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            required
            placeholder="e.g. 100100000006_LN"
            value={loanAccountNumber}
            onChange={(e) => setLoanAccountNumber(e.target.value)}
            style={{ flex: 1, padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? 'Searching...' : 'Lookup Loan'} <Search size={16} />
          </button>
        </div>
      </form>

      {/* Step 2: Payment Configuration */}
      {loanData && (
        <form onSubmit={handlePayEmi} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '13px', background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>BORROWER</span>
              <strong style={{ color: '#0f172a', fontSize: '14px' }}>{loanData.borrower_name}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>CURRENT EMI REMAINING</span>
              <strong style={{ color: '#d97706', fontSize: '15px' }}>₹{Number(currentEmiRemaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>TOTAL REMAINING BALANCE</span>
              <strong style={{ color: '#16a34a', fontSize: '15px' }}>₹{Number(loanData.remaining_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>PAYMENT MODE</label>
            <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                <input 
                  type="radio" 
                  name="payMode" 
                  checked={paymentMode === 'CASH'} 
                  onChange={() => setPaymentMode('CASH')} 
                />
                Pay via Cash (OTC)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                <input 
                  type="radio" 
                  name="payMode" 
                  checked={paymentMode === 'ACCOUNT'} 
                  onChange={() => setPaymentMode('ACCOUNT')} 
                />
                Pay from Customer Account
              </label>
            </div>
          </div>

          {paymentMode === 'ACCOUNT' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>SELECT SOURCE ACCOUNT</label>
              <select
                value={selectedAccountNum}
                onChange={(e) => setSelectedAccountNum(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', outline: 'none' }}
              >
                {(customerAccounts || []).map((acc) => (
                  <option key={acc?.account_number} value={acc?.account_number}>
                    {acc?.account_number} ({acc?.account_type}) - Balance: ₹{Number(acc?.balance || 0).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>EMI AMOUNT (₹)</label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: '#fff', outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={paying}
            style={{ width: '100%', background: '#059669', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: paying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {paying ? 'Processing Payment...' : 'Confirm & Process EMI Payment'} <ArrowRight size={16} />
          </button>
        </form>
      )}

      {/* Success Modal */}
      {successData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '28px', maxWidth: '460px', width: '90%', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '56px', height: '56px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} color="#16a34a" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>EMI Paid Successfully!</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been processed and loan schedule updated.
            </p>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', textAlign: 'left', fontSize: '13px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Remaining Balance:</span>
                <strong style={{ color: '#2563eb' }}>
                  ₹{Number(successData.loan_remaining_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Transaction Ref:</span>
                <strong style={{ color: '#0f172a' }}>{successData.transaction.ref_number}</strong>
              </div>
            </div>

            <button
              onClick={handleReset}
              style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 0', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};