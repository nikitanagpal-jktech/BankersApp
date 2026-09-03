import React from 'react';
import {
  UserPlus,
  Building,
  UserCheck,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  BookOpen,
  DollarSign,
  Landmark,
  ListOrdered,
  Users,
} from 'lucide-react';

export type TabType =
  | 'create_new'
  | 'create_additional'
  | 'update_account'
  | 'customer_details'
  | 'accounts'
  | 'teller'
  | 'transfer'
  | 'ledger'
  | '360'
  | 'loan_sanction'
  | 'loan_emi'
  | 'loan_details';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const menuItems = [
    { id: 'create_new', label: 'Create New Account', icon: UserPlus },
    { id: 'create_additional', label: 'Create Additional Account', icon: Building },
    { id: 'update_account', label: 'Update Customer', icon: UserCheck },
    { id: 'customer_details', label: 'Customers', icon: Users },
    { id: 'accounts', label: 'Accounts', icon: CreditCard },
    { id: 'teller', label: 'Deposit / Withdraw', icon: Banknote },
    { id: 'transfer', label: 'Transfer Money', icon: ArrowRightLeft },
    { id: 'ledger', label: 'Transaction History', icon: BookOpen },
    // NOTE: '360' (Account 360 / Account Details) is removed from the sidebar menu 
    // so it only appears in the background when accessed directly from Customers or Accounts List.
    { id: 'loan_sanction', label: 'Sanction Loan', icon: DollarSign },
    { id: 'loan_emi', label: 'Pay EMI', icon: Landmark },
    { id: 'loan_details', label: 'Loan Details', icon: ListOrdered },
  ];

  return (
    <aside
      style={{
        width: '18vw',
        minWidth: '200px',
        maxWidth: '260px',
        flexShrink: 0,
        background: 'linear-gradient(180deg, #071326 0%, #0a192f 100%)',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        position: 'sticky',
        top: '64px',
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as TabType)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 12px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#f1f5f9';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }
              }}
            >
              <Icon size={18} color={isActive ? '#ffffff' : '#64748b'} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};