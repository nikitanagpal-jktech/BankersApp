import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BankerProfile } from '../types';

interface BankerAuthContextType {
  banker: BankerProfile | null;
  token: string | null;
  login: (token: string, banker: BankerProfile) => void;
  logout: (reason?: string) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const BankerAuthContext = createContext<BankerAuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes of inactivity
const MAX_SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours absolute limit

export const BankerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [banker, setBanker] = useState<BankerProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearClientCookies = () => {
    const cookies = ['token', 'banker_token', 'session', 'connect.sid'];
    cookies.forEach((name) => {
      document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      document.cookie = `${name}=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    });
  };

  const logout = useCallback(async (reason?: string) => {
    try {
      await fetch('/api/banker/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      sessionStorage.removeItem('banker_login_time');
      sessionStorage.removeItem('banker_last_active');
      sessionStorage.removeItem('active_dashboard_tab');
      localStorage.removeItem('banker_token');
      clearClientCookies();

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      setBanker(null);
      setToken(null);

      // ONLY set auth_message if a specific expiration reason was passed
      if (reason) {
        sessionStorage.setItem('auth_message', reason);
      } else {
        sessionStorage.removeItem('auth_message');
      }

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }, []);

  const login = (newToken: string, newBanker: BankerProfile) => {
    const now = String(Date.now());
    sessionStorage.setItem('banker_login_time', now);
    sessionStorage.setItem('banker_last_active', now);
    sessionStorage.removeItem('auth_message'); // Clear notice on fresh successful login
    setToken(newToken || 'ACTIVE_COOKIE_SESSION');
    setBanker(newBanker);
  };

  useEffect(() => {
    async function verifySession() {
      try {
        const res = await fetch('/api/banker/auth/me', {
          credentials: 'include',
        });
        // Inside your session checks or API handlers, if a 401 or 403 occurs:
        if (res.status === 401 || res.status === 403) {
            logout('Your session has expired. Please log in again.');
        }

        if (res.ok) {
          const data = await res.json();

          const loginTime = Number(sessionStorage.getItem('banker_login_time') || Date.now());
          if (Date.now() - loginTime > MAX_SESSION_MS) {
            await logout('Session expired (8-hour limit reached). Please log in again.');
            return;
          }

          const lastActive = Number(sessionStorage.getItem('banker_last_active') || Date.now());
          if (Date.now() - lastActive > IDLE_TIMEOUT_MS) {
            await logout('Session expired due to 20 minutes of inactivity. Please log in again.');
            return;
          }

          if (!sessionStorage.getItem('banker_login_time')) {
            sessionStorage.setItem('banker_login_time', String(Date.now()));
          }
          sessionStorage.setItem('banker_last_active', String(Date.now()));

          setBanker(data.banker);
          setToken('ACTIVE_COOKIE_SESSION');
        } else {
          // If the API call fails or cookie is missing on boot, 
          // we do NOT trigger a banner (since it's just a normal unauthenticated first visit)
          sessionStorage.removeItem('auth_message');
          setBanker(null);
          setToken(null);
        }
      } catch (err) {
        setBanker(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, [logout]);

  useEffect(() => {
    if (!banker) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    const resetIdleTimer = () => {
      sessionStorage.setItem('banker_last_active', String(Date.now()));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        logout('Session expired due to 20 minutes of inactivity. Please log in again.');
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetIdleTimer, { passive: true }));

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetIdleTimer));
    };
  }, [banker, logout]);

  return (
    <BankerAuthContext.Provider
      value={{
        banker,
        token,
        login,
        logout,
        isAuthenticated: !!banker,
        loading,
      }}
    >
      {children}
    </BankerAuthContext.Provider>
  );
};

export const useBankerAuth = () => {
  const context = useContext(BankerAuthContext);
  if (!context) throw new Error('useBankerAuth must be used within BankerAuthProvider');
  return context;
};

