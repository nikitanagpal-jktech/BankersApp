import React, { useState, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { UserPlus, User, Phone, ShieldCheck, MapPin, CreditCard, ArrowLeft, CheckCircle2} from 'lucide-react';
import { useBankerAuth } from '../context/BankerAuthContext';

interface Props {
  onSuccess?: (accountNumber: string) => void;
}

const MaskedDateInput = forwardRef<HTMLInputElement, any>(({ value, onClick, onChange, placeholder }, ref) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value.replace(/\D/g, '');
    if (inputVal.length > 8) inputVal = inputVal.slice(0, 8);

    if (inputVal.length > 4) {
      inputVal = `${inputVal.slice(0, 2)}/${inputVal.slice(2, 4)}/${inputVal.slice(4)}`;
    } else if (inputVal.length > 2) {
      inputVal = `${inputVal.slice(0, 2)}/${inputVal.slice(2)}`;
    }

    e.target.value = inputVal;
    onChange(e);
  };

  return (
    <input
      ref={ref}
      type="text"
      placeholder={placeholder || 'DD/MM/YYYY'}
      value={value}
      onClick={onClick}
      onChange={handleInputChange}
      maxLength={10}
      className="custom-datepicker-input"
      required
    />
  );
});

export const CreateNewAccount: React.FC<Props> = () => {
  const { banker } = useBankerAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const initialFormState = {
    first_name: '',
    last_name: '',
    dob: '',
    gender: 'Male',
    marital_status: 'Single',
    primary_mobile: '',
    secondary_phone: '',
    email: '',
    pan: '',
    aadhaar: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    account_type: 'SAVINGS' as 'SAVINGS' | 'CURRENT',
    initial_deposit: '1000.00',
  };

  const [form, setForm] = useState(initialFormState);
  const [selectedDob, setSelectedDob] = useState<Date | null>(null);

  // Holds newly created account data to show in-place
  const [createdSummary, setCreatedSummary] = useState<{
    customerId: string;
    customerName: string;
    accountNumber: string;
    accountType: string;
    balance: string;
    branchName: string;
    ifscCode: string;
  } | null>(null);

  const handleDateChange = (date: Date | null) => {
    setSelectedDob(date);
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setForm((prev) => ({ ...prev, dob: `${year}-${month}-${day}` }));
    } else {
      setForm((prev) => ({ ...prev, dob: '' }));
    }
  };

  const handleManualDateType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length === 10) {
      const [day, month, year] = val.split('/').map(Number);
      const parsedDate = new Date(year, month - 1, day);
      if (!isNaN(parsedDate.getTime()) && parsedDate.getDate() === day) {
        setSelectedDob(parsedDate);
        setForm((prev) => ({
          ...prev,
          dob: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        }));
        return;
      }
    }
    if (!val) {
      setSelectedDob(null);
      setForm((prev) => ({ ...prev, dob: '' }));
    }
  };

  const handleResetAndBack = () => {
    setCreatedSummary(null);
    setForm(initialFormState);
    setSelectedDob(null);
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dob) {
      setMsg({ type: 'error', text: 'Please enter a valid Date of Birth.' });
      return;
    }
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/banker/accounts/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Onboarding failed');

      setCreatedSummary({
        customerId: data.data.customer.customer_id,
        customerName: `${data.data.customer.first_name} ${data.data.customer.last_name}`,
        accountNumber: data.data.account.account_number,
        accountType: data.data.account.account_type,
        balance: data.data.account.balance,
        branchName: banker?.branch_name || 'Nidhi Bank Branch',
        ifscCode: banker?.ifsc_code || 'NIDH0001',
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
        /* Summary View with Back Action */
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
            <ArrowLeft size={16} /> Back to Create Account
          </button>

          <div style={{ background: '#f8fafc', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#16a34a', fontWeight: 800, fontSize: '18px', marginBottom: '20px' }}>
              <CheckCircle2 size={24} /> New Account Generated Successfully!
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
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>ACCOUNT NUMBER</span>
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
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>REGISTERED BRANCH</span>
                <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                  {createdSummary.branchName} ({createdSummary.ifscCode})
                </strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Onboarding Form */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px' }}>
              <UserPlus size={24} color="#2563eb" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Create New Account</h2>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Complete customer registration and primary account opening</div>
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#1e40af', marginBottom: '24px' }}>
            Branch: <strong>{banker?.branch_name} ({banker?.ifsc_code})</strong>
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 1. Personal Details */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                <User size={16} color="#2563eb" /> Personal Details
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      FIRST NAME <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      LAST NAME <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      DATE OF BIRTH <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <DatePicker
                      selected={selectedDob}
                      onChange={handleDateChange}
                      dateFormat="dd/MM/yyyy"
                      maxDate={new Date()}
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      customInput={<MaskedDateInput onChange={handleManualDateType} />}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      GENDER <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      MARITAL STATUS <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={form.marital_status}
                      onChange={(e) => setForm({ ...form, marital_status: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Contact Details */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                <Phone size={16} color="#2563eb" /> Contact Details
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      PRIMARY MOBILE <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={form.primary_mobile}
                      onChange={(e) => setForm({ ...form, primary_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      SECONDARY PHONE <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="Optional alternate mobile"
                      value={form.secondary_phone}
                      onChange={(e) => setForm({ ...form, secondary_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    EMAIL <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Government Identification */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                <ShieldCheck size={16} color="#2563eb" /> Government Identification
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    PAN CARD NUMBER <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={form.pan}
                    onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    AADHAAR NUMBER <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="12-digit UID"
                    value={form.aadhaar}
                    onChange={(e) => setForm({ ...form, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Residential Address */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                <MapPin size={16} color="#2563eb" /> Residential Address
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    ADDRESS LINE 1 <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="House/Flat No, Building, Street"
                    value={form.address_line1}
                    onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    ADDRESS LINE 2 <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Locality, Landmark"
                    value={form.address_line2}
                    onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      CITY <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      STATE <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      PIN CODE <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.postal_code}
                      onChange={(e) => setForm({ ...form, postal_code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      COUNTRY <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
                    >
                      <option value="India">India</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Account Configuration */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                <CreditCard size={16} color="#2563eb" /> Account Configuration
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>ACCOUNT TYPE</label>
                  <select
                    value={form.account_type}
                    onChange={(e) => setForm({ ...form, account_type: e.target.value as any })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
                  >
                    <option value="SAVINGS">SAVINGS (Floor ₹500)</option>
                    <option value="CURRENT">CURRENT (Floor ₹1000)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    INITIAL DEPOSIT (₹) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={form.initial_deposit}
                    onChange={(e) => setForm({ ...form, initial_deposit: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Submitting KYC...' : 'Onboard Customer & Issue Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};