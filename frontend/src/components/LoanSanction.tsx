import React, { useState } from 'react';
import { FileCheck, CheckCircle2, Save, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
    onSuccess: (accNum: string) => void;
    onNavigateToDetails?: () => void;
}

export const LoanSanction: React.FC<Props> = ({ onSuccess, onNavigateToDetails }) => {
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Verification state
    const [verifiedCustomer, setVerifiedCustomer] = useState<any | null>(null);
    const [customerAccounts, setCustomerAccounts] = useState<any[]>([]);

    const [form, setForm] = useState({
        customer_id: '',
        disbursal_account_number: '',
        principal_amount: '100000',
        interest_rate: '10.5',
        tenure_months: '24',
    });

    // State to hold sanctioned loan details after disbursement
    const [sanctionedLoan, setSanctionedLoan] = useState<{
        loanAccountNumber: string;
        disbursal_account_number: string;
        customer_name: string;
        principal_amount: string;
        interest_rate: string;
        tenure_months: number;
        monthly_emi: string;
        ref_number: string;
        new_balance: string;
    } | null>(null);

    // Helper to mask account numbers (shows only last 4 digits)
    const maskAccountNumber = (accNo: string) => {
        if (!accNo || accNo.length <= 4) return accNo;
        const lastFour = accNo.slice(-4);
        const maskedPart = '*'.repeat(accNo.length - 4);
        return `${maskedPart}${lastFour}`;
    };

    const handleVerifyCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.customer_id.trim()) {
            setMsg({ type: 'error', text: 'Please enter a valid Customer ID (CIF).' });
            return;
        }

        setVerifying(true);
        setMsg(null);
        setVerifiedCustomer(null);
        setCustomerAccounts([]);

        try {
            const res = await fetch(`/api/banker/loans/customer/${form.customer_id.trim()}/accounts`, {
                credentials: 'include',
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Customer verification failed.');

            setVerifiedCustomer(data.customer);
            setCustomerAccounts(data.accounts || []);
            if (data.accounts && data.accounts.length > 0) {
                setForm(prev => ({ ...prev, disbursal_account_number: data.accounts[0].account_number }));
            }
        } catch (err: any) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setVerifying(false);
        }
    };

    const handleDisburse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.disbursal_account_number) {
            setMsg({ type: 'error', text: 'Please select a disbursal account.' });
            return;
        }

        setLoading(true);
        setMsg(null);
        setSanctionedLoan(null);

        try {
            const res = await fetch('/api/banker/loans/sanction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Loan Sanction failed');

            const loan = data.data.loan || data.data;
            const tx = data.data.transaction || {};
            const newBal = data.data.disbursal_account_balance || data.data.new_balance || '0.00';

            const mappedDetails = {
                loanAccountNumber: loan.loan_account_number || loan.loanAccountNumber,
                disbursal_account_number: loan.disbursal_account_number || form.disbursal_account_number,
                customer_name: verifiedCustomer?.name || form.customer_id.toUpperCase(),
                principal_amount: loan.principal_amount || form.principal_amount,
                interest_rate: loan.interest_rate || form.interest_rate,
                tenure_months: Number(loan.tenure_months || form.tenure_months),
                monthly_emi: loan.monthly_emi || '0.00',
                ref_number: tx.ref_number || `DSB${Date.now()}`,
                new_balance: newBal,
            };

            setSanctionedLoan(mappedDetails);
            setMsg({ type: 'success', text: `Loan Sanctioned successfully! Sanctioned Account: ${mappedDetails.loanAccountNumber}` });
            onSuccess(form.disbursal_account_number);
        } catch (err: any) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndConfirm = () => {
        if (onNavigateToDetails) {
            onNavigateToDetails();
        } else {
            setSanctionedLoan(null);
            setVerifiedCustomer(null);
            setCustomerAccounts([]);
            setForm({
                customer_id: '',
                disbursal_account_number: '',
                principal_amount: '100000',
                interest_rate: '10.5',
                tenure_months: '24',
            });
            setMsg({ type: 'success', text: 'Loan record saved and added to Transaction History.' });
        }
    };

    return (
        <div style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px' }}>
                    <FileCheck size={24} color="#2563eb" />
                </div>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Loan Sanction</h2>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Verify customer, select masked disbursal account, and disburse retail loans</div>
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {msg.text}
                </div>
            )}

            {sanctionedLoan ? (
                /* Sanctioned Details Card */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#f8fafc', border: '1.5px solid #bfdbfe', borderRadius: '10px', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: 800, fontSize: '16px', marginBottom: '16px' }}>
                            <CheckCircle2 size={22} /> Loan Sanctioned & Disbursed!
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', fontSize: '13px' }}>
                            <div>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>NEW LOAN ACCOUNT</span>
                                <strong style={{ color: '#2563eb', fontSize: '16px' }}>{sanctionedLoan.loanAccountNumber}</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>CUSTOMER CIF</span>
                                <strong style={{ color: '#0f172a', fontSize: '14px' }}>{sanctionedLoan.customer_name}</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>DISBURSAL ACCOUNT</span>
                                <strong style={{ color: '#0f172a', fontSize: '14px' }}>{sanctionedLoan.disbursal_account_number}</strong>
                            </div>

                            <div>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>SANCTIONED PRINCIPAL</span>
                                <strong style={{ color: '#16a34a', fontSize: '16px' }}>₹{Number(sanctionedLoan.principal_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>CALCULATED MONTHLY EMI</span>
                                <strong style={{ color: '#2563eb', fontSize: '16px' }}>₹{Number(sanctionedLoan.monthly_emi).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>TENURE & RATE</span>
                                <strong style={{ color: '#0f172a', fontSize: '14px' }}>{sanctionedLoan.tenure_months} Months @ {sanctionedLoan.interest_rate}% p.a.</strong>
                            </div>

                            <div>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>TRANSACTION REF</span>
                                <strong style={{ color: '#64748b', fontSize: '13px' }}>{sanctionedLoan.ref_number}</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>UPDATED SAVINGS BALANCE</span>
                                <strong style={{ color: '#0f172a', fontSize: '14px' }}>₹{Number(sanctionedLoan.new_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleSaveAndConfirm}
                            style={{
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                padding: '14px 28px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '14px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                            }}
                        >
                            <Save size={16} /> Save & View in Loan Details <ArrowRight size={16} />
                        </button>
                        <button
                            onClick={() => {
                                setSanctionedLoan(null);
                                setVerifiedCustomer(null);
                                setCustomerAccounts([]);
                                setForm({ customer_id: '', disbursal_account_number: '', principal_amount: '100000', interest_rate: '10.5', tenure_months: '24' });
                            }}
                            style={{
                                background: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                padding: '14px 20px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '14px',
                                cursor: 'pointer',
                            }}
                        >
                            Sanction Another Loan
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Step 1: Customer ID Verification */}
                    <form onSubmit={handleVerifyCustomer} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                            CUSTOMER CIF ID <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <input
                                type="text"
                                required
                                placeholder="e.g. CUST000001"
                                value={form.customer_id}
                                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                                style={{ flex: 1, padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                            />
                            <button
                                type="submit"
                                disabled={verifying}
                                style={{
                                    background: '#2563eb',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '0 24px',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: verifying ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                {verifying ? 'Verifying...' : 'Verify Customer'} <ShieldCheck size={16} />
                            </button>
                        </div>
                    </form>

                    {/* Step 2: Account Selection & Loan Parameters (Shown after verification) */}
                    {verifiedCustomer && (
                        <form onSubmit={handleDisburse} style={{ background: '#ffffff', border: '1.5px solid #2563eb', borderRadius: '10px', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ gridColumn: '1 / -1', background: '#eff6ff', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700, display: 'block' }}>VERIFIED BORROWER</span>
                                    <strong style={{ color: '#0f172a', fontSize: '15px' }}>{verifiedCustomer.name}</strong>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700, display: 'block' }}>MOBILE</span>
                                    <strong style={{ color: '#334155', fontSize: '14px' }}>{verifiedCustomer.mobile}</strong>
                                </div>
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                    SELECT DISBURSAL ACCOUNT (MASKED) <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                {customerAccounts.length === 0 ? (
                                    <div style={{ color: '#dc2626', fontSize: '13px' }}>No active savings or current accounts found for this customer.</div>
                                ) : (
                                    <select
                                        value={form.disbursal_account_number}
                                        onChange={(e) => setForm({ ...form, disbursal_account_number: e.target.value })}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', outline: 'none' }}
                                    >
                                        {customerAccounts.map((acc) => (
                                            <option key={acc.account_number} value={acc.account_number}>
                                                {maskAccountNumber(acc.account_number)} — {acc.account_type} (Balance: ₹{Number(acc.balance).toLocaleString('en-IN')})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                    PRINCIPAL AMOUNT (₹) <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={form.principal_amount}
                                    onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
                                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: '2 / 3' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                        INTEREST RATE (%) <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={form.interest_rate}
                                        onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                                        style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                        TENURE (MONTHS) <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={form.tenure_months}
                                        onChange={(e) => setForm({ ...form, tenure_months: e.target.value })}
                                        style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                                <button
                                    type="submit"
                                    disabled={loading || customerAccounts.length === 0}
                                    style={{
                                        background: '#059669',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '14px 28px',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        width: '100%'
                                    }}
                                >
                                    {loading ? 'Processing Disbursal...' : 'Sanction & Disburse Loan'} <ArrowRight size={16} />
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};