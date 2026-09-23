import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AlertCircle } from 'lucide-react';
import { showToast } from '../../components/common/Toast';
import { RootForgeLogo } from '../../components/common/RootForgeLogo';
import { TopControls } from '../../components/common/TopControls';

export const LoginPage = () => {
  const { login } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchParams = new URLSearchParams(location.search);
  const isExpired = searchParams.get('expired') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError(lang === 'hi' ? 'कृपया ईमेल और पासवर्ड दोनों दर्ज करें।' : lang === 'gu' ? 'કૃપા કરીને ઇમેઇલ અને પાસવર્ડ બંને દાખલ કરો.' : 'Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await login(email, password);
      if (res?.requiresVerification) {
        showToast(
          lang === 'hi'
            ? 'सत्यापन कोड भेजा गया! कृपया लॉगिन पूरा करने के लिए अपना ईमेल सत्यापित करें।'
            : lang === 'gu'
            ? 'ચકાસણી કોડ મોકલ્યો! લૉગિન પૂર્ણ કરવા માટે કૃપા કરીને તમારો ઇમેઇલ ચકાસો.'
            : 'Verification code dispatched! Please verify your email to complete login.',
          'info'
        );
        navigate('/verify-email', {
          state: {
            email,
            cooldownRemaining: res.cooldownRemaining || 30,
            warning: res.warning,
            notice: res.message,
            devCode: res.devCode
          }
        });
        return;
      }
      showToast(lang === 'hi' ? 'सफलतापूर्वक साइन इन किया गया।' : lang === 'gu' ? 'સફળતાપૂર્વક સાઇન ઇન થયા.' : 'Welcome back! Signed in successfully.');
      navigate('/app/workspaces');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Standardized Responsive Top Header */}
      <header className="app-top-header">
        <TopControls />
      </header>

      <div className="auth-card-wrapper">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}>
            <RootForgeLogo size="lg" variant={theme === 'dark' ? 'light' : 'dark'} subtitle="ENTERPRISE SOLUTION BUILDER" />
          </div>
          <p className="auth-subtitle">
            {t.auth.signInSubtitle}
          </p>
        </div>

        {isExpired && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={16} />
            {lang === 'hi' ? 'आपका सत्र समाप्त हो गया है। कृपया पुनः साइन इन करें।' : lang === 'gu' ? 'તમારું સત્ર સમાપ્ત થઈ ગયું છે. કૃપા કરીને ફરીથી સાઇન ઇન કરો.' : 'Your session has expired. Please sign in again.'}
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Standard Login Form */}
        <div className="card" style={{ padding: 'clamp(18px, 4vw, 24px)', boxShadow: 'var(--shadow-md)', width: '100%' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t.auth.email}</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ minHeight: 44, fontSize: '0.95rem' }}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>{t.auth.password}</label>
                <Link to="/forgot-password" style={{ fontSize: '0.78rem', color: '#D97706', textDecoration: 'none', fontWeight: 600 }}>
                  {t.auth.forgotPassword}
                </Link>
              </div>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ minHeight: 44, fontSize: '0.95rem' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', minHeight: 46, padding: '12px 0', marginTop: 8, fontSize: '0.95rem', fontWeight: 700 }}
            >
              {loading ? t.common.loading : t.auth.signInBtn}
            </button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {t.auth.noAccount}{' '}
            <Link to="/register" style={{ color: '#D97706', fontWeight: 700, textDecoration: 'none' }}>
              {t.auth.createOne}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
