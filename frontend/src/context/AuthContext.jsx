import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { nativeStorage } from '../services/nativeService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('aisb_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('aisb_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      let activeToken = token;
      let activeUser = user;

      // On mobile / Capacitor, restore from nativeStorage if localStorage is empty
      if (!activeToken) {
        try {
          const nativeTok = await nativeStorage.get('aisb_token');
          if (nativeTok) {
            activeToken = nativeTok;
            setToken(nativeTok);
            localStorage.setItem('aisb_token', nativeTok);
            const nativeUsr = await nativeStorage.get('aisb_user');
            if (nativeUsr) {
              const parsedUsr = JSON.parse(nativeUsr);
              activeUser = parsedUsr;
              setUser(parsedUsr);
              localStorage.setItem('aisb_user', nativeUsr);
            }
          }
        } catch {
          // Ignore native storage read errors
        }
      }

      if (activeToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          localStorage.setItem('aisb_user', JSON.stringify(res.user));
          nativeStorage.set('aisb_user', JSON.stringify(res.user)).catch(() => {});
        } catch (err) {
          console.warn('Session verification failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (res.requiresVerification) {
      return res;
    }
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('aisb_token', res.token);
    localStorage.setItem('aisb_user', JSON.stringify(res.user));
    nativeStorage.set('aisb_token', res.token).catch(() => {});
    nativeStorage.set('aisb_user', JSON.stringify(res.user)).catch(() => {});
    return res.user;
  };

  const register = async (payload) => {
    const res = await api.register(payload);
    if (res.requiresVerification) {
      return res;
    }
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('aisb_token', res.token);
    localStorage.setItem('aisb_user', JSON.stringify(res.user));
    nativeStorage.set('aisb_token', res.token).catch(() => {});
    nativeStorage.set('aisb_user', JSON.stringify(res.user)).catch(() => {});
    return res.user;
  };

  const verifyEmailOtp = async (email, otp) => {
    const res = await api.verifyEmailOtp(email, otp);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('aisb_token', res.token);
    localStorage.setItem('aisb_user', JSON.stringify(res.user));
    nativeStorage.set('aisb_token', res.token).catch(() => {});
    nativeStorage.set('aisb_user', JSON.stringify(res.user)).catch(() => {});
    return res.user;
  };

  const resendVerificationOtp = async (email) => {
    return await api.resendVerificationOtp(email);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('aisb_token');
    localStorage.removeItem('aisb_user');
    localStorage.removeItem('aisb_pending_verify_email');

    // Asynchronously ensure Capacitor native Preferences are cleared on mobile
    nativeStorage.remove('aisb_token').catch(() => {});
    nativeStorage.remove('aisb_user').catch(() => {});
    nativeStorage.remove('aisb_pending_verify_email').catch(() => {});
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      verifyEmailOtp,
      resendVerificationOtp,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

