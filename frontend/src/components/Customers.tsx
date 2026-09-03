import React, { useState, useEffect } from 'react';
import { Users, Search, Eye, ArrowLeft, Shield, Phone, Mail, MapPin, CreditCard, AlertCircle, ExternalLink } from 'lucide-react';
import { TabType } from './Sidebar';

interface CustomersProps {
  onSelectAccount?: (accNum: string, origin: TabType) => void;
  initialSelectedCustomerId?: string | null;
  onSelectCustomer?: (custId: string | null) => void;
}

export const Customers: React.FC<CustomersProps> = ({ 
  onSelectAccount, 
  initialSelectedCustomerId = null, 
  onSelectCustomer 
}) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [error, setError] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialSelectedCustomerId);
    const [profileData, setProfileData] = useState<{ customer: any; accounts: any[] } | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // Debounce search input to avoid spamming requests while typing
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1); // Reset to page 1 on new search query
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch customers whenever page or debounced search changes
    useEffect(() => {
        if (!selectedCustomerId) {
            fetchCustomers(currentPage, debouncedSearch);
        }
    }, [currentPage, debouncedSearch, selectedCustomerId]);

    useEffect(() => {
        if (initialSelectedCustomerId) {
            handleViewProfile(initialSelectedCustomerId, false);
        }
    }, [initialSelectedCustomerId]);

    const fetchCustomers = async (page: number, query: string) => {
        setLoading(true);
        setError('');
        try {
            let url = `/api/banker/customers/all?page=${page}`;
            if (query.trim()) {
                url = `/api/banker/customers/search?q=${encodeURIComponent(query)}&page=${page}`;
            }

            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load customers.');
            
            setCustomers(data.customers || []);
            if (data.pagination) {
                setTotalPages(data.pagination.totalPages || 1);
                setTotalItems(data.pagination.totalItems || data.customers.length);
            } else {
                setTotalPages(1);
                setTotalItems(data.customers.length);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewProfile = async (customerId: string, updateParent = true) => {
        setSelectedCustomerId(customerId);
        if (updateParent && onSelectCustomer) {
            onSelectCustomer(customerId);
        }
        setProfileLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/banker/customers/${customerId}/details`, { credentials: 'include' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load customer profile.');
            setProfileData({ customer: data.customer, accounts: data.accounts || [] });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProfileLoading(false);
        }
    };

    const handleBackToList = () => {
        setSelectedCustomerId(null);
        setProfileData(null);
        if (onSelectCustomer) {
            onSelectCustomer(null);
        }
    };

    return (
        <div style={{ background: '#ffffff', border: '1px solid #dbe4f0', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            {selectedCustomerId ? (
                <div>
                    <button
                        onClick={handleBackToList}
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
                            marginBottom: '20px',
                        }}
                    >
                        <ArrowLeft size={16} /> Back to Customers List
                    </button>

                    {profileLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading customer profile...</div>
                    ) : profileData ? (
                        <div>
                            <div style={{ background: '#0f172a', borderRadius: '12px', padding: '24px', color: '#ffffff', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Customer Profile</div>
                                    <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0' }}>
                                        {profileData.customer.first_name} {profileData.customer.last_name}
                                    </h2>
                                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>CIF ID: <strong style={{ color: '#ffffff' }}>{profileData.customer.customer_id}</strong></div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ background: '#1e293b', border: '1px solid #334155', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', color: '#4ade80', fontWeight: 700 }}>
                                        KYC Verified
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Phone size={14} /> PRIMARY MOBILE
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{profileData.customer.primary_mobile}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Mail size={14} /> EMAIL ADDRESS
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{profileData.customer.email || 'N/A'}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Shield size={14} /> PAN & GENDER
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{profileData.customer.pan} ({profileData.customer.gender})</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <MapPin size={14} /> RESIDENTIAL ADDRESS
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                                        {profileData.customer.address_line1}, {profileData.customer.city}, {profileData.customer.state} - {profileData.customer.postal_code}
                                    </div>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CreditCard size={18} color="#2563eb" /> Customer's Accounts (Click to view details)
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                                {profileData.accounts.map((acc: any) => (
                                    <div
                                        key={acc.account_number}
                                        onClick={() => onSelectAccount && onSelectAccount(acc.account_number, 'customer_details')}
                                        style={{
                                            background: '#ffffff',
                                            border: '1.5px solid #cbd5e1',
                                            borderRadius: '10px',
                                            padding: '16px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#2563eb';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.15)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px' }}>
                                                {acc.account_type}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontSize: '12px', fontWeight: 700 }}>
                                                <span>View 360</span> <ExternalLink size={14} />
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>{acc.account_number}</div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                                            Balance: Hidden (Click to open 360)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px' }}>
                                <Users size={22} color="#2563eb" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Customers</h2>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Registered customers in your branch: {totalItems}</div>
                            </div>
                        </div>

                        <div style={{ position: 'relative', width: '280px' }}>
                            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                            <input
                                type="text"
                                placeholder="Search by ID, Name, Mobile, PAN..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading branch customers...</div>
                    ) : (
                        <div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                                            <th style={{ padding: '12px 16px', fontWeight: 700 }}>Customer ID</th>
                                            <th style={{ padding: '12px 16px', fontWeight: 700 }}>Full Name</th>
                                            <th style={{ padding: '12px 16px', fontWeight: 700 }}>Mobile</th>
                                            <th style={{ padding: '12px 16px', fontWeight: 700 }}>Email</th>
                                            <th style={{ padding: '12px 16px', fontWeight: 700 }}>City</th>
                                            <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customers.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No customers found.</td>
                                            </tr>
                                        ) : (
                                            customers.map((c) => (
                                                <tr key={c.customer_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#2563eb' }}>{c.customer_id}</td>
                                                    <td style={{ padding: '14px 16px', color: '#0f172a', fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                                                    <td style={{ padding: '14px 16px', color: '#334155' }}>{c.primary_mobile}</td>
                                                    <td style={{ padding: '14px 16px', color: '#475569' }}>{c.email || 'N/A'}</td>
                                                    <td style={{ padding: '14px 16px', color: '#475569' }}>{c.city}</td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleViewProfile(c.customer_id)}
                                                            style={{
                                                                background: '#eff6ff',
                                                                color: '#2563eb',
                                                                border: 'none',
                                                                padding: '6px 14px',
                                                                borderRadius: '6px',
                                                                fontWeight: 700,
                                                                fontSize: '12px',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                            }}
                                                        >
                                                            <Eye size={14} /> View Profile
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls (10 items per page) */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 4px' }}>
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1 || loading}
                                    style={{
                                        background: currentPage === 1 ? '#f1f5f9' : '#2563eb',
                                        color: currentPage === 1 ? '#94a3b8' : '#ffffff',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    Previous
                                </button>

                                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                                    Page {currentPage} of {totalPages || 1}
                                </span>

                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || totalPages === 0 || loading}
                                    style={{
                                        background: currentPage === totalPages || totalPages === 0 ? '#f1f5f9' : '#2563eb',
                                        color: currentPage === totalPages || totalPages === 0 ? '#94a3b8' : '#ffffff',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};