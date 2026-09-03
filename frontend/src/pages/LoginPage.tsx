import React, { useState, useEffect } from 'react';
import { useBankerAuth } from '../context/BankerAuthContext';
import { Landmark, User, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useBankerAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const [isEmpReadOnly, setIsEmpReadOnly] = useState(true);
  const [isPassReadOnly, setIsPassReadOnly] = useState(true);

  useEffect(() => {
    const notice = sessionStorage.getItem('auth_message');
    if (notice) {
      setSessionNotice(notice);
      sessionStorage.removeItem('auth_message');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/banker/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ employee_id: employeeId.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      // Set initial dashboard tab to create_new on successful login
      sessionStorage.setItem('active_dashboard_tab', 'create_new');
      login(data.token, data.banker);
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : err.message || 'Authentication failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #071326 0%, #0d2347 50%, #0a192f 100%)',
      padding: '20px',
    }}>
      {/* Inline style block to hide browser-native password reveal icons (Edge/IE/Chrome) */}
      <style>{`
        input::-ms-reveal,
        input::-ms-clear,
        input::-webkit-credentials-auto-fill-button {
          display: none !important;
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '40px 36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Bank Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            padding: '14px',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
            marginBottom: '12px',
          }}>
            <Landmark size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a192f', letterSpacing: '-0.5px' }}>
            NIDHI BANK
          </h1>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
            Core Banking System Terminal
          </span>
        </div>

        {sessionNotice && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            color: '#b45309',
            padding: '12px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '20px',
            fontWeight: 600,
          }}>
            <AlertCircle size={16} />
            <span>{typeof sessionNotice === 'string' ? sessionNotice : String(sessionNotice)}</span>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#991b1b',
            padding: '12px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '20px',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, overflow: 'hidden', zIndex: -1 }}>
            <input type="text" name="fake_usernamenotused" tabIndex={-1} autoComplete="off" />
            <input type="password" name="fake_passwordnotused" tabIndex={-1} autoComplete="off" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              EMPLOYEE ID
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              <input
                type="text"
                required
                readOnly={isEmpReadOnly}
                onFocus={() => setIsEmpReadOnly(false)}
                name="cbs_emp_terminal_id"
                autoComplete="new-password"
                placeholder="e.g. EMP1001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 40px',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '14px',
                  fontWeight: 500,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8', zIndex: 2 }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                readOnly={isPassReadOnly}
                onFocus={() => setIsPassReadOnly(false)}
                name="cbs_terminal_auth_key"
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 40px',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '14px',
                  fontWeight: 500,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  zIndex: 3,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              border: 'none',
              padding: '13px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verifying Credentials...' : 'Sign In to Terminal'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};