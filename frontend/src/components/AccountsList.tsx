import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Search, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateDMY } from '../utils/formatters';
import { useBankerAuth } from '../context/BankerAuthContext';

interface AccountItem {
  account_number: string;
  account_type: string;
  balance: string;
  min_balance: string;
  status: string;
  created_at: string;
  customer_id: string;
  customer_name: string;
  primary_mobile: string;
  pan: string;
  branch_name: string;
  ifsc_code: string;
}

interface Props {
  onSelectAccount: (accNum: string) => void;
}

export const AccountsList: React.FC<Props> = ({ onSelectAccount }) => {
  const { logout } = useBankerAuth();
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState('');

  // Simple debounce for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAccounts = async (page: number, searchTerm: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/banker/accounts/all?page=${page}&search=${encodeURIComponent(searchTerm)}`, { credentials: 'include' });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        await logout('Session expired. Please log in again.');
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load accounts.');
      }

      setAccounts(data.accounts || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalItems(data.pagination.totalItems || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  return (
    <div style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px' }}>
            <Users size={22} color="#2563eb" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Branch Accounts</h2>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Total registered accounts in your branch: {totalItems}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Search Input Bar Added Back */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by Name, CIF, A/C..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '8px 12px 8px 32px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', width: '240px', outline: 'none' }}
            />
          </div>

          <button
            onClick={() => fetchAccounts(currentPage, debouncedSearch)}
            disabled={loading}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px 10px' }}>Account Number</th>
              <th style={{ padding: '12px 10px' }}>Customer Details</th>
              <th style={{ padding: '12px 10px' }}>Created Date</th>
              <th style={{ padding: '12px 10px' }}>Type</th>
              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Balance</th>
              <th style={{ padding: '12px 10px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '12px 10px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                  {loading ? 'Loading accounts...' : 'No matching branch accounts found.'}
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr key={acc.account_number} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{acc.account_number}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{acc.ifsc_code}</div>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{acc.customer_name}</div>
                    <div style={{ fontSize: '11px', color: '#2563eb' }}>{acc.customer_id} • {acc.primary_mobile}</div>
                  </td>
                  <td style={{ padding: '12px 10px', color: '#64748b' }}>{formatDateDMY(acc.created_at)}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#e2e8f0', color: '#334155' }}>
                      {acc.account_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                    ₹{Number(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: acc.status === 'ACTIVE' ? '#ecfdf5' : '#fee2e2',
                      color: acc.status === 'ACTIVE' ? '#059669' : '#dc2626',
                    }}>
                      {acc.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    <button
                      onClick={() => onSelectAccount(acc.account_number)}
                      style={{
                        padding: '5px 10px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        color: '#2563eb',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      View <ArrowUpRight size={12} />
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
          Showing page {currentPage} of {totalPages} ({totalItems} total accounts)
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
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
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
              cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};