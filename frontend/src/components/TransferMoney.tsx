import React, { useState } from 'react';
import { ArrowRightLeft, CheckCircle2 } from 'lucide-react';

interface Props {
  onSuccess?: (accNum: string) => void;
}

export const TransferMoney: React.FC<Props> = () => {
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal State
  const [modalData, setModalData] = useState<{
    fromAccount: string;
    toAccount: string;
    amount: string;
    refNumber: string;
    newSenderBalance: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/banker/transactions/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          from_account: fromAccount.trim(),
          to_account: toAccount.trim(),
          amount,
          description: description || 'Account to Account Fund Transfer',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');

      setModalData({
        fromAccount: fromAccount.trim(),
        toAccount: toAccount.trim(),
        amount,
        refNumber: data.transaction?.ref_number || data.data?.ref_number || 'TXN_TRANSFER_SUCCESS',
        newSenderBalance: data.sender_balance || data.data?.sender_balance || '0.00',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalData(null);
    setFromAccount('');
    setToAccount('');
    setAmount('');
    setDescription('');
    setError('');
  };

  return (
    <div style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
      
      {/* Success Popup Modal */}
      {modalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '28px 32px',
            width: '100%',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '50%' }}>
              <CheckCircle2 size={32} color="#059669" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Funds Transferred Successfully !!
            </h3>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '8px', width: '100%', fontSize: '13px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><span style={{ color: '#64748b' }}>From Account:</span> <strong>{modalData.fromAccount}</strong></div>
              <div><span style={{ color: '#64748b' }}>To Beneficiary:</span> <strong>{modalData.toAccount}</strong></div>
              <div><span style={{ color: '#64748b' }}>Amount Transferred:</span> <strong style={{ color: '#059669' }}>₹{Number(modalData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
              <div><span style={{ color: '#64748b' }}>Reference ID:</span> <strong>{modalData.refNumber}</strong></div>
              <div><span style={{ color: '#64748b' }}>Sender Balance:</span> <strong style={{ color: '#0f172a' }}>₹{Number(modalData.newSenderBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
            </div>

            <button
              onClick={handleModalClose}
              style={{
                width: '100%',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '11px 0',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '4px',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px' }}>
          <ArrowRightLeft size={24} color="#2563eb" />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Transfer Money</h2>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Internal account-to-account funds transfer</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              SOURCE / DEBIT ACCOUNT <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="12-digit Sender Account"
              value={fromAccount}
              onChange={(e) => setFromAccount(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              BENEFICIARY / CREDIT ACCOUNT <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="12-digit Beneficiary Account"
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              TRANSFER AMOUNT (₹) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              placeholder="Enter transfer amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              PAYMENT REMARKS
            </label>
            <input
              type="text"
              placeholder="e.g. Rent, Invoice, Transfer"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }} >
          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '15px 35px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Processing Transfer...' : 'Authorize & Transfer Funds'}
          </button>
        </div>
      </form>
    </div>
  );
};