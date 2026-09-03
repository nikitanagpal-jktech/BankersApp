import React, { useState, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { UserCheck, Search, User, Phone, MapPin, Calendar, CreditCard, Building2, CheckCircle2 } from 'lucide-react';
import { formatDateDMY } from '../utils/formatters';

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

export const UpdateAccount: React.FC = () => {
  const [searchAccount, setSearchAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Non-changeable details state
  const [customerId, setCustomerId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('');
  const [accountCreatedAt, setAccountCreatedAt] = useState('');
  const [branchName, setBranchName] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const [selectedDob, setSelectedDob] = useState<Date | null>(null);

  const initialForm = {
    first_name: '',
    last_name: '',
    dob: '',
    gender: 'Male',
    marital_status: 'Single',
    primary_mobile: '',
    secondary_phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  };

  const [form, setForm] = useState(initialForm);

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

  const handleSearch = async (target = searchAccount) => {
    if (!target.trim()) return;
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/banker/accounts/${target.trim()}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Account not found');

      const c = data.customer;
      const a = data.account;

      setCustomerId(c.customer_id || '');
      setAccountNumber(a.account_number || '');
      setAccountType(a.account_type || '');
      setAccountCreatedAt(formatDateDMY(a.created_at));
      setBranchName(a.branch?.branch_name || 'Nidhi Bank Branch');
      setIfscCode(a.branch?.ifsc_code || 'NIDH0001');

      if (c.dob) {
        const d = new Date(c.dob);
        if (!isNaN(d.getTime())) {
          setSelectedDob(d);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          setForm((prev) => ({ ...prev, dob: `${year}-${month}-${day}` }));
        }
      }

      setForm((prev) => ({
        ...prev,
        first_name: c.first_name || '',
        last_name: c.last_name || '',
        gender: c.gender || 'Male',
        marital_status: c.marital_status || 'Single',
        primary_mobile: c.primary_mobile ? c.primary_mobile.replace(/^\+91/, '') : '',
        secondary_phone: c.secondary_phone ? c.secondary_phone.replace(/^\+91/, '') : '',
        email: c.email || '',
        address_line1: c.address_line1 || (c.address ? c.address.split(',')[0] : ''),
        address_line2: c.address_line2 || '',
        city: c.city || '',
        state: c.state || '',
        postal_code: c.postal_code || '',
        country: c.country || 'India',
      }));
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
      setCustomerId('');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/banker/accounts/customer/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setShowSuccessModal(true);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    setSearchAccount('');
    setCustomerId('');
    setAccountNumber('');
    setAccountType('');
    setAccountCreatedAt('');
    setBranchName('');
    setIfscCode('');
    setSelectedDob(null);
    setForm(initialForm);
    setMsg(null);
  };

  return (
    <div style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
      {/* Success Modal */}
      {showSuccessModal && (
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
              Account Details updated !!
            </h3>

            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Customer profile changes have been saved securely.
            </p>

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
                marginTop: '6px',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px' }}>
          <UserCheck size={24} color="#2563eb" />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Update Customer Details</h2>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Modify personal, communication, and residential details</div>
        </div>
      </div>

      {/* Lookup Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
        <input
          type="text"
          placeholder="Enter Customer Id or Account Number..."
          value={searchAccount}
          onChange={(e) => setSearchAccount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1, padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
        />
        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={loading}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            padding: '0 24px',
            borderRadius: '8px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <Search size={16} /> {loading ? 'Fetching...' : 'Fetch Details'}
        </button>
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

      {customerId ? (
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 3x2 Non-Changeable Identifiers Grid */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '20px 24px',
            borderRadius: '10px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '18px 24px',
          }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>CUSTOMER CIF</span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{customerId}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>ACCOUNT NUMBER</span>
              <strong style={{ fontSize: '14px', color: '#2563eb' }}>{accountNumber}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>ACCOUNT TYPE</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <CreditCard size={13} color="#2563eb" />
                <span style={{ fontSize: '13px', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px' }}>
                  {accountType}
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>CREATION DATE</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Calendar size={13} color="#64748b" />
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{accountCreatedAt}</strong>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>BRANCH NAME</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Building2 size={13} color="#64748b" />
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{branchName}</strong>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>IFSC CODE</span>
              <span style={{ fontSize: '13px', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px' }}>
                {ifscCode}
              </span>
            </div>
          </div>

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
                    dateFormat="dd/mm/yyyy"
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

          {/* 3. Residential Address */}
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

          <div style={{ marginTop: '8px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving Changes...' : 'Save Updated Details'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{
          padding: '60px 20px',
          border: '2px dashed #e2e8f0',
          borderRadius: '10px',
          textAlign: 'center',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
        }}>
          <div style={{ background: '#e2e8f0', padding: '12px', borderRadius: '50%' }}>
            <Search size={24} color="#64748b" />
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>
            No Account Loaded
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: 0 }}>
            Enter a Customer ID or Account Number in the search bar above and click <strong>Fetch Details</strong> to view and update customer information.
          </p>
        </div>
      )}
    </div>
  );
};