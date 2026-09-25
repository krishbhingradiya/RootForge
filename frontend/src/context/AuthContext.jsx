import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { nativeStorage } from '../services/nativeService';

const AuthContext = createContext(null);

export const ADMIN_EMAIL = 'mgpro9090@gmail.com';

const sanitizeUser = (rawUser) => {
  if (!rawUser) return null;
  const isRealAdmin = rawUser.email?.trim().toLowerCase() === ADMIN_EMAIL;
  return {
    ...rawUser,
    role: isRealAdmin ? (rawUser.role === 'ADMIN' ? 'ADMIN' : 'ADMIN') : (rawUser.role === 'ADMIN' ? 'CONSULTANT' : rawUser.role)
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(() => {
    try {
      const stored = localStorage.getItem('aisb_user');
      return stored ? sanitizeUser(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
  });

  const setUser = (newUser) => {
    setUserState(sanitizeUser(newUser));
  };
  const [token, setToken] = useState(() => localStorage.getItem('aisb_token') || null);
  // Fast bootstrap: If user and token already exist in storage, app is immediately interactive
  const [loading, setLoading] = useState(() => {
    const storedTok = typeof localStorage !== 'undefined' ? localStorage.getItem('aisb_token') : null;
    const storedUsr = typeof localStorage !== 'undefined' ? localStorage.getItem('aisb_user') : null;
    return !storedTok && !storedUsr;
  });

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      let activeToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('aisb_token') : null);
      let activeUser = user || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('aisb_user') || 'null') : null);

      // On mobile / Capacitor, restore from nativeStorage if localStorage is empty
      if (!activeToken) {
        try {
          const nativeTok = await nativeStorage.get('aisb_token');
          if (nativeTok && isMounted) {
            activeToken = nativeTok;
            setToken(nativeTok);
            localStorage.setItem('aisb_token', nativeTok);
            const nativeUsr = await nativeStorage.get('aisb_user');
            if (nativeUsr && isMounted) {
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

      // If active token exists and we don't have user, or to validate in background
      if (activeToken) {
        if (!activeUser) {
          try {
            const res = await api.getMe();
            if (isMounted) {
              setUser(res.user);
              localStorage.setItem('aisb_user', JSON.stringify(res.user));
              nativeStorage.set('aisb_user', JSON.stringify(res.user)).catch(() => {});
            }
          } catch (err) {
            console.warn('Session verification failed:', err.message);
            if (isMounted) logout();
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []); // Run ONLY once on mount for session restoration

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

  const isRealAdmin = Boolean(user && user.email && user.email.trim().toLowerCase() === ADMIN_EMAIL && user.role === 'ADMIN');

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
      isAuthenticated: !!user,
      isAdmin: isRealAdmin
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

