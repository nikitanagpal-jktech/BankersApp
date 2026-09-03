import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar, TabType } from '../components/Sidebar';
import { CreateNewAccount } from '../components/CreateNewAccount';
import { CreateAdditionalAccount } from '../components/CreateAdditionalAccount';
import { UpdateAccount } from '../components/UpdateAccount';
import { Customers } from '../components/Customers';
import { AccountsList } from '../components/AccountsList';
import { DepositWithdraw } from '../components/DepositWithdraw';
import { TransferMoney } from '../components/TransferMoney';
import { TransactionsHistory } from '../components/TransactionsHistory';
import { AccountTransactions } from '../components/AccountTransactions';
import { LoanSanction } from '../components/LoanSanction';
import { LoanEmi } from '../components/LoanEmi';
import { LoanDetails } from '../components/LoanDetails';

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (sessionStorage.getItem('active_dashboard_tab') as TabType) || 'create_new';
  });
  const [targetAccount, setTargetAccount] = useState('');
  const [previousTab, setPreviousTab] = useState<TabType>('customer_details');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.setItem('active_dashboard_tab', activeTab);
  }, [activeTab]);

  const handleAccountSelect = (accNum: string, originTab: TabType = activeTab) => {
    setTargetAccount(accNum);
    setPreviousTab(originTab);
    setActiveTab('360');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f8fc' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1, marginTop: '64px' }}>
        <Sidebar activeTab={activeTab === '360' ? previousTab : activeTab} onSelectTab={(tab) => {
          if (tab === 'customer_details') setSelectedCustomerId(null); // Reset when clicking sidebar directly
          setActiveTab(tab);
        }} />

        <main style={{ flex: 1, padding: '28px', overflowY: 'auto', background: '#f4f8fc' }}>
          {activeTab === 'create_new' && <CreateNewAccount />}
          {activeTab === 'create_additional' && <CreateAdditionalAccount />}
          {activeTab === 'update_account' && <UpdateAccount />}
          {activeTab === 'customer_details' && (
            <Customers 
              initialSelectedCustomerId={selectedCustomerId}
              onSelectCustomer={setSelectedCustomerId}
              onSelectAccount={(acc) => handleAccountSelect(acc, 'customer_details')} 
            />
          )}
          {activeTab === 'accounts' && <AccountsList onSelectAccount={(acc) => handleAccountSelect(acc, 'accounts')} />}
          {activeTab === 'teller' && <DepositWithdraw />}
          {activeTab === 'transfer' && <TransferMoney />}
          {activeTab === 'ledger' && <TransactionsHistory />}
          {activeTab === '360' && (
            <AccountTransactions 
              initialAccount={targetAccount} 
              onBack={() => setActiveTab(previousTab)} 
            />
          )}
          {activeTab === 'loan_sanction' && (
            <LoanSanction
              onSuccess={(acc) => handleAccountSelect(acc, 'loan_sanction')}
              onNavigateToDetails={() => setActiveTab('loan_details')}
            />
          )}
          {activeTab === 'loan_emi' && <LoanEmi />}
          {activeTab === 'loan_details' && <LoanDetails />}
        </main>
      </div>
    </div>
  );
};