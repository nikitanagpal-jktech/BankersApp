import React, { useState, useEffect } from 'react';
import { History, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { TransactionRecord } from '../types';
import { formatDateDMY } from '../utils/formatters';

export const TransactionsHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchLedger = async (page: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/banker/transactions?page=${page}`, { credentials: 'include' });
      const data = await res.json();
      
      setTransactions(data.transactions || data.data || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalItems(data.pagination.totalItems || 0);
      }
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger(currentPage);
  }, [currentPage]);

  return (
    <div style={{ background: '#ffffff', border: '1px solid #dbe4f0', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px' }}>
            <History size={20} color="#2563eb" />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Transactions History</h2>
          </div>
        </div>

        <button
          onClick={() => fetchLedger(currentPage)}
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
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px 10px' }}>Ref Number</th>
              <th style={{ padding: '12px 10px' }}>Date (DD/MM/YYYY)</th>
              <th style={{ padding: '12px 10px' }}>Type</th>
              <th style={{ padding: '12px 10px' }}>From</th>
              <th style={{ padding: '12px 10px' }}>To</th>
              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ padding: '12px 10px' }}>Banker</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                  {loading ? 'Loading ledger records...' : 'No transaction records found.'}
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.transaction_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 600, color: '#0f172a' }}>{tx.ref_number}</td>
                  <td style={{ padding: '12px 10px', color: '#64748b' }}>{formatDateDMY(tx.created_at)}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#e2e8f0', color: '#334155' }}>
                      {tx.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', color: '#475569' }}>{tx.from_account || 'OTC CASH'}</td>
                  <td style={{ padding: '12px 10px', color: '#475569' }}>{tx.to_account || 'OTC CASH'}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                    ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 10px', color: '#2563eb', fontWeight: 600 }}>
                    {tx.banker_id || tx.performed_by_banker_id || 'SYSTEM'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Showing page {currentPage} of {totalPages} ({totalItems} total records)
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
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
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
              cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};