import React from 'react';
import { useBankerAuth } from '../context/BankerAuthContext';
import { Landmark, Building2, UserCircle, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { banker, logout } = useBankerAuth();

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '64px',
      background: '#0a192f',
      borderBottom: '1px solid #132a4a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: '#2563eb', padding: '7px', borderRadius: '8px' }}>
          <Landmark size={20} color="#ffffff" />
        </div>
        <div>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>
            NIDHI BANK
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#132a4a',
          border: '1px solid #1e3a68',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontWeight: 700 }}>
            <UserCircle size={15} /> {banker?.employee_id} ({banker?.name})
          </span>
          <span style={{ color: '#334e77' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
            <Building2 size={15} /> {banker?.branch_name}
          </span>
          <span style={{ background: '#2563eb', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
            {banker?.ifsc_code}
          </span>
        </div>

        <button
          onClick={()=> logout()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ef4444',
            border: 'none',
            color: '#ffffff',
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </header>
  );
};