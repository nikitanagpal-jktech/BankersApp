import React, { useState } from 'react';
import { Banknote, CheckCircle2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface Props {
  onSuccess?: (accNum: string) => void;
}

export const DepositWithdraw: React.FC<Props> = () => {
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<'DEPOSIT' | 'WITHDRAW' | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalDetails, setModalDetails] = useState<{
    action: 'DEPOSIT' | 'WITHDRAW';
    amount: string;
    accountNumber: string;
    refNumber: string;
  } | null>(null);

  const handleTransaction = async (actionType: 'DEPOSIT' | 'WITHDRAW') => {
    if (!accountNumber.trim() || !amount || Number(amount) <= 0) {
      setMsg({ type: 'error', text: 'Please enter a valid account number and amount.' });
      return;
    }

    setActiveAction(actionType);
    setLoading(true);
    setMsg(null);

    const endpoint = actionType === 'DEPOSIT'
      ? '/api/banker/transactions/deposit'
      : '/api/banker/transactions/withdraw';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          account_number: accountNumber.trim(),
          amount,
          description: description || `Counter OTC ${actionType}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transaction rejected');

      setModalDetails({
        action: actionType,
        amount: Number(amount).toFixed(2),
        accountNumber: accountNumber.trim(),
        refNumber: data.data?.txRecord?.ref_number || data.transaction?.ref_number || 'PROCESSED',
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    setModalDetails(null);
    setAccountNumber('');
    setAmount('');
    setDescription('');
    setMsg(null);
  };

  return (
    <div style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
      
      {/* Success Popup Modal */}
      {showSuccessModal && modalDetails && (
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
            maxWidth: '380px',
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
              Amount {modalDetails.action === 'DEPOSIT' ? 'Deposited' : 'Withdrawn'} !!
            </h3>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', width: '100%', fontSize: '13px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><span style={{ color: '#64748b' }}>Account:</span> <strong>{modalDetails.accountNumber}</strong></div>
              <div><span style={{ color: '#64748b' }}>Amount:</span> <strong style={{ color: modalDetails.action === 'DEPOSIT' ? '#059669' : '#dc2626' }}>₹{modalDetails.amount}</strong></div>
              <div><span style={{ color: '#64748b' }}>Ref Number:</span> <strong>{modalDetails.refNumber}</strong></div>
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px' }}>
          <Banknote size={24} color="#2563eb" />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Deposit / Withdraw</h2>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Execute instant cash counter deposits and withdrawals</div>
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

      {/* Input Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ gridColumn: '1 / span 1' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
            ACCOUNT NUMBER <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Enter 12-digit Account Number (e.g. 100100000001)"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }}
          />
        </div>

        <div style={{ gridColumn: '2 / span 1' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
            AMOUNT (₹) <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="1"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }}
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
            REMARKS
          </label>
          <input
            type="text"
            placeholder="Counter transaction remarks..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }}
          />
        </div>

        {/* Dual Action Buttons at Bottom */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px', marginTop: '10px' }}>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleTransaction('DEPOSIT')}
            style={{
              flex: 1,
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '14px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
            }}
          >
            <ArrowDownCircle size={18} />
            {loading && activeAction === 'DEPOSIT' ? 'Processing Deposit...' : 'Deposit Cash'}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleTransaction('WITHDRAW')}
            style={{
              flex: 1,
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '14px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
            }}
          >
            <ArrowUpCircle size={18} />
            {loading && activeAction === 'WITHDRAW' ? 'Processing Withdrawal...' : 'Withdraw Cash'}
          </button>
        </div>
      </div>
    </div>
  );
};