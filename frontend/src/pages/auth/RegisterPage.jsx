import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Sparkles, AlertCircle } from 'lucide-react';
import { showToast } from '../../components/common/Toast';
import { RootForgeLogo } from '../../components/common/RootForgeLogo';
import { TopControls } from '../../components/common/TopControls';

export const RegisterPage = () => {
  const { register } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError(lang === 'hi' ? 'नाम, ईमेल और पासवर्ड आवश्यक हैं।' : lang === 'gu' ? 'નામ, ઇમેઇલ અને પાસવર્ડ આવશ્યક છે.' : 'Name, email, and password are required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await register({ name, email, password, organizationName, role: 'CONSULTANT' });
      if (res?.requiresVerification) {
        if (res.warning) {
          showToast(res.warning, 'warning');
        } else {
          showToast(
            lang === 'hi' 
              ? 'सत्यापन कोड आपके ईमेल पर भेजा गया है!' 
              : lang === 'gu' 
              ? 'ચકાસણી કોડ તમારા ઇમેઇલ પર મોકલવામાં આવ્યો છે!' 
              : 'Verification code sent to your email!',
            'info'
          );
        }
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
      showToast(lang === 'hi' ? 'खाता सफलतापूर्वक बनाया गया!' : lang === 'gu' ? 'ખાતું સફળતાપૂર્વક બનાવવામાં આવ્યું!' : 'Account created successfully! Welcome to AI Solution Builder.');
      navigate('/app/workspaces');
    } catch (err) {
      setError(err.message || 'Registration failed.');
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
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}>
            <RootForgeLogo size="lg" variant={theme === 'dark' ? 'light' : 'dark'} subtitle="ENTERPRISE SOLUTION BUILDER" />
          </div>
          <h1 className="auth-heading">
            {t.auth?.registerTitle || 'Create Your Enterprise Account'}
          </h1>
          <p className="auth-subtitle">
            {t.auth?.joinTeams || 'Join transformation teams, consultants, and architects'}
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="card" style={{ padding: 'clamp(18px, 4vw, 24px)', boxShadow: 'var(--shadow-md)', width: '100%' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t.auth?.fullName || 'Full Name'}</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Elena Rostova"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ minHeight: 44, fontSize: '0.95rem' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t.auth?.email || 'Corporate Email Address'}</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@enterprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ minHeight: 44, fontSize: '0.95rem' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t.auth?.orgName || 'Organization Name'}</label>
              <input
                type="text"
                className="form-input"
                placeholder="Acme Retail Global"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                style={{ minHeight: 44, fontSize: '0.95rem' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t.auth?.password || 'Password'}</label>
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
              {loading ? (lang === 'hi' ? 'खाता बना रहा है...' : lang === 'gu' ? 'ખાતું બની રહ્યું છે...' : 'Creating Account...') : (t.auth?.registerBtn || 'Create Enterprise Account')}
            </button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {t.auth?.haveAccount || 'Already have an account?'}{' '}
            <Link to="/login" style={{ color: '#D97706', fontWeight: 700, textDecoration: 'none' }}>
              {t.auth?.loginLink || 'Sign In'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
