import React, { useState } from 'react';
import { Building, Search, UserCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { CustomerKYC } from '../types';

interface Props {
  onSuccess?: (accountNumber: string) => void;
}

export const CreateAdditionalAccount: React.FC<Props> = () => {
  const [customerId, setCustomerId] = useState('');
  const [accountType, setAccountType] = useState<'SAVINGS' | 'CURRENT'>('CURRENT');
  const [initialDeposit, setInitialDeposit] = useState('1000.00');

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<CustomerKYC | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // In-place summary state
  const [createdSummary, setCreatedSummary] = useState<{
    customerId: string;
    customerName: string;
    accountNumber: string;
    accountType: string;
    balance: string;
    ifscCode: string;
  } | null>(null);

  const handleVerifyCustomer = async () => {
    if (!customerId.trim()) return;
    setSearching(true);
    setMsg(null);
    setCustomer(null);

    try {
      const res = await fetch(`/api/banker/accounts/all`, { credentials: 'include' });
      const data = await res.json();
      const match = data.accounts?.find(
        (a: any) => a.customer_id.toLowerCase() === customerId.trim().toLowerCase()
      );

      if (match) {
        setCustomer({
          customer_id: match.customer_id,
          first_name: match.customer_name.split(' ')[0],
          last_name: match.customer_name.split(' ')[1] || '',
          dob: '',
          primary_mobile: match.primary_mobile,
          pan: match.pan,
          aadhaar: '[VERIFIED]',
          address: match.branch_name,
        });
      } else {
        throw new Error('CIF profile not found in branch records.');
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSearching(false);
    }
  };

  const handleResetAndBack = () => {
    setCreatedSummary(null);
    setCustomerId('');
    setCustomer(null);
    setInitialDeposit('1000.00');
    setMsg(null);
  };

  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/banker/accounts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: customerId.trim(),
          account_type: accountType,
          initial_deposit: initialDeposit,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Account creation failed');

      setCreatedSummary({
        customerId: data.data.customer.customer_id,
        customerName: `${data.data.customer.first_name} ${data.data.customer.last_name}`,
        accountNumber: data.data.account.account_number,
        accountType: data.data.account.account_type,
        balance: data.data.account.balance,
        ifscCode: data.data.ifsc_code,
      });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      {createdSummary ? (
        <div>
          <button
            onClick={handleResetAndBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: '24px',
            }}
          >
            <ArrowLeft size={16} /> Back to Open Another Account
          </button>

          <div style={{ background: '#f8fafc', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#16a34a', fontWeight: 800, fontSize: '18px', marginBottom: '20px' }}>
              <CheckCircle2 size={24} /> Additional Account Generated Successfully!
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px 24px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>CUSTOMER CIF</span>
                <strong style={{ color: '#0f172a', fontSize: '15px' }}>{createdSummary.customerId}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>CUSTOMER NAME</span>
                <strong style={{ color: '#0f172a', fontSize: '15px' }}>{createdSummary.customerName}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>NEW ACCOUNT NUMBER</span>
                <strong style={{ color: '#2563eb', fontSize: '16px' }}>{createdSummary.accountNumber}</strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>ACCOUNT TYPE</span>
                <span style={{ display: 'inline-block', marginTop: '2px', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {createdSummary.accountType}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>OPENING BALANCE</span>
                <strong style={{ color: '#16a34a', fontSize: '16px' }}>
                  ₹{Number(createdSummary.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>IFSC CODE</span>
                <span style={{ display: 'inline-block', marginTop: '2px', background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {createdSummary.ifscCode}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px' }}>
              <Building size={24} color="#2563eb" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Create Additional Account</h2>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Issue a secondary savings or current account under an existing CIF profile</div>
            </div>
          </div>

          {msg && (
            <div style={{
              padding: '14px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '24px',
              background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: msg.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
              color: msg.type === 'success' ? '#065f46' : '#991b1b',
            }}>
              {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Enter Customer ID (e.g. CUST000001)..."
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyCustomer()}
              style={{ flex: 1, padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
            />
            <button
              type="button"
              onClick={handleVerifyCustomer}
              disabled={searching}
              style={{
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                padding: '0 24px',
                borderRadius: '8px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: searching ? 'not-allowed' : 'pointer',
              }}
            >
              <Search size={16} /> {searching ? 'Checking...' : 'Verify CIF'}
            </button>
          </div>

          {customer && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                <UserCheck size={16} /> Verified Customer Profile
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px' }}>
                <div><span style={{ color: '#64748b' }}>Name:</span> <strong>{customer.first_name} {customer.last_name}</strong></div>
                <div><span style={{ color: '#64748b' }}>PAN:</span> <strong>{customer.pan}</strong></div>
                <div><span style={{ color: '#64748b' }}>Mobile:</span> <strong>{customer.primary_mobile}</strong></div>
              </div>
            </div>
          )}

          <form onSubmit={handleOpenAccount} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                ACCOUNT TYPE
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as any)}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
              >
                <option value="CURRENT">CURRENT (₹1000)</option>
                <option value="SAVINGS">SAVINGS (₹500)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                INITIAL DEPOSIT AMOUNT (₹)
              </label>
              <input
                type="number"
                required
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={loading || !customerId}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: loading || !customerId ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Creating Account...' : 'Open Additional Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};