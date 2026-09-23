import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Sparkles, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, Lock, Mail } from 'lucide-react';
import { TopControls } from '../../components/common/TopControls';
import { RootForgeLogo } from '../../components/common/RootForgeLogo';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';

export const ForgotPasswordPage = () => {
  const { t, lang } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState('REQUEST'); // 'REQUEST' | 'RESET' | 'SUCCESS'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Step 1: Request Password Reset OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError(lang === 'hi' ? 'कृपया कॉर्पोरेट ईमेल दर्ज करें।' : lang === 'gu' ? 'કૃપા કરીને કોર્પોરેટ ઇમેઇલ દાખલ કરો.' : 'Please enter your corporate email.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setNotice('');
      const res = await api.forgotPassword(email);
      showToast(
        lang === 'hi'
          ? 'सत्यापन कोड आपके ईमेल पर भेज दिया गया है।'
          : lang === 'gu'
          ? 'ચકાસણી કોડ તમારા ઇમેઇલ પર મોકલવામાં આવ્યો છે.'
          : 'Verification code sent to your corporate email.',
        'info'
      );
      if (res.devCode) {
        setNotice(`Development Mode OTP: ${res.devCode}`);
      }
      setStep('RESET');
    } catch (err) {
      setError(err.message || 'Failed to dispatch password reset code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with 6-digit OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      setError(lang === 'hi' ? 'कृपया सभी फ़ील्ड भरें।' : lang === 'gu' ? 'કૃપા કરીને બધી વિગતો ભરો.' : 'Please fill all required fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError(lang === 'hi' ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' : lang === 'gu' ? 'પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરોનો હોવો જોઈએ.' : 'Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(lang === 'hi' ? 'पासवर्ड मेल नहीं खाते।' : lang === 'gu' ? 'પાસવર્ડ મેળ ખાતા નથી.' : 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.resetPassword({ email, otp: otp.trim(), newPassword });
      showToast(
        lang === 'hi'
          ? 'पासवर्ड सफलतापूर्वक रीसेट हो गया है।'
          : lang === 'gu'
          ? 'પાસવર્ડ સફળતાપૂર્વક રીસેટ થઈ ગયો છે.'
          : 'Password reset successfully! You can now sign in.',
        'success'
      );
      setStep('SUCCESS');
    } catch (err) {
      setError(err.message || 'Password reset failed. Please check your verification code.');
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
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}>
            <RootForgeLogo size="lg" variant={theme === 'dark' ? 'light' : 'dark'} subtitle="ENTERPRISE SOLUTION BUILDER" />
          </div>
          <p className="auth-subtitle">
            {step === 'REQUEST' && (t.auth?.resetPasswordSubtitle || 'Enter your corporate email address to receive recovery instructions')}
            {step === 'RESET' && (lang === 'hi' ? 'अपने ईमेल में भेजा गया 6-अंकीय कोड और नया पासवर्ड दर्ज करें' : lang === 'gu' ? 'તમારા ઇમેઇલ પર મોકલેલો 6-અંકનો કોડ અને નવો પાસવર્ડ દાખલ કરો' : 'Enter the 6-digit verification code sent to your email and your new password')}
            {step === 'SUCCESS' && (lang === 'hi' ? 'आपका पासवर्ड अपडेट हो गया है' : lang === 'gu' ? 'તમારો પાસવર્ડ અપડેટ થઈ ગયો છે' : 'Your password has been updated')}
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Sparkles size={16} style={{ flexShrink: 0 }} />
            <span>{notice}</span>
          </div>
        )}

        <div className="card" style={{ padding: 'clamp(18px, 4vw, 24px)', boxShadow: 'var(--shadow-md)', width: '100%' }}>
          {step === 'SUCCESS' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle2 size={46} color="#059669" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {lang === 'hi' ? 'पासवर्ड सफलतापूर्वक बदला गया' : lang === 'gu' ? 'પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો' : 'Password Successfully Reset'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6, marginBottom: 20 }}>
                {lang === 'hi'
                  ? 'अब आप अपने नए पासवर्ड के साथ अपने खाते में साइन इन कर सकते हैं।'
                  : lang === 'gu'
                  ? 'હવે તમે તમારા નવા પાસવર્ડ સાથે તમારા ખાતામાં સાઇન ઇન કરી શકો છો.'
                  : 'You can now sign in to your RootForge account using your new credentials.'}
              </p>
              <Link to="/login" className="btn btn-primary" style={{ width: '100%', minHeight: 44, justifyContent: 'center', fontWeight: 700 }}>
                {t.auth?.returnToSignIn || 'Sign In with New Password'}
              </Link>
            </div>
          ) : step === 'RESET' ? (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">
                  {lang === 'hi' ? 'ईमेल पता' : lang === 'gu' ? 'ઇમેઇલ સરનામું' : 'Corporate Email'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="form-input"
                    style={{ backgroundColor: 'var(--bg-subtle)', opacity: 0.8 }}
                  />
                  <button
                    type="button"
                    onClick={() => setStep('REQUEST')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#D97706', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {lang === 'hi' ? 'बदलें' : lang === 'gu' ? 'બદલો' : 'Change'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <KeyRound size={14} color="#D97706" />
                  {lang === 'hi' ? '6-अंकीय सत्यापन कोड' : lang === 'gu' ? '6-અંકનો ચકાસણી કોડ' : '6-Digit Verification Code'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  className="form-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  style={{ minHeight: 44, fontSize: '1.2rem', textAlign: 'center', letterSpacing: '6px', fontWeight: 700, fontFamily: 'monospace' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={14} color="#D97706" />
                  {lang === 'hi' ? 'नया पासवर्ड' : lang === 'gu' ? 'નવો પાસવર્ડ' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ minHeight: 44, fontSize: '0.95rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {lang === 'hi' ? 'नए पासवर्ड की पुष्टि करें' : lang === 'gu' ? 'નવા પાસવર્ડની પુષ્ટિ કરો' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ minHeight: 44, fontSize: '0.95rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', minHeight: 46, padding: '12px 0', marginTop: 8, fontSize: '0.95rem', fontWeight: 700 }}
              >
                {loading ? t.common.loading : (lang === 'hi' ? 'पासवर्ड रीसेट करें' : lang === 'gu' ? 'પાસવર્ડ રીસેટ કરો' : 'Set New Password')}
              </button>

              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setStep('REQUEST')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ArrowLeft size={14} /> {lang === 'hi' ? 'पुनः कोड भेजें' : lang === 'gu' ? 'ફરીથી કોડ મોકલો' : 'Request a new code'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRequestOtp}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={14} color="#D97706" />
                  {t.auth?.email || 'Corporate Email Address'}
                </label>
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

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', minHeight: 46, padding: '12px 0', marginTop: 8, fontSize: '0.95rem', fontWeight: 700 }}
              >
                {loading ? t.common.loading : (t.auth?.sendRecovery || 'Send Verification Code')}
              </button>

              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none', minHeight: 38 }}>
                  <ArrowLeft size={14} /> {t.auth?.backToSignIn || 'Back to Sign In'}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default ForgotPasswordPage;
