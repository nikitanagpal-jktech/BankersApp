import React from 'react';
import { BankerAuthProvider, useBankerAuth } from './context/BankerAuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useBankerAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #071326 0%, #0d2347 50%, #0a192f 100%)',
          color: '#38bdf8',
          fontSize: '14px',
          fontWeight: 600,
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid #1e3a8a',
            borderTop: '3px solid #38bdf8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <span>Initializing Nidhi Bank Terminal...</span>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return isAuthenticated ? <DashboardPage /> : <LoginPage />;
};

export function App() {
  return (
    <BankerAuthProvider>
      <AppContent />
    </BankerAuthProvider>
  );
}

export default App;