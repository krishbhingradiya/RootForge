import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { showToast } from '../../components/common/Toast';
import { RootForgeLogo } from '../../components/common/RootForgeLogo';
import { TopControls } from '../../components/common/TopControls';

export const VerifyEmailPage = () => {
  const { verifyEmailOtp, resendVerificationOtp } = useAuth();
  const { t, lang } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve email and cooldown from router state or localStorage
  const emailState = location.state?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('aisb_pending_verify_email') : '') || '';
  const initialCooldown = location.state?.cooldownRemaining || 30;
  const initialWarning = location.state?.warning || (typeof localStorage !== 'undefined' ? localStorage.getItem('aisb_pending_verify_warning') : '') || '';
  const initialNotice = location.state?.notice || (typeof localStorage !== 'undefined' ? localStorage.getItem('aisb_pending_verify_notice') : '') || '';
  const initialDevCode = location.state?.devCode || (typeof localStorage !== 'undefined' ? localStorage.getItem('aisb_pending_verify_dev_code') : '') || '';

  const [email, setEmail] = useState(emailState);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [warning, setWarning] = useState(initialWarning);
  const [notice, setNotice] = useState(initialNotice);
  const [devCode, setDevCode] = useState(initialDevCode);

  const inputRefs = useRef([]);

  // Store pending verify state in localStorage for resilience against page refresh
  useEffect(() => {
    if (email) localStorage.setItem('aisb_pending_verify_email', email);
    if (warning) localStorage.setItem('aisb_pending_verify_warning', warning);
    if (notice) localStorage.setItem('aisb_pending_verify_notice', notice);
    if (devCode) localStorage.setItem('aisb_pending_verify_dev_code', devCode);
  }, [email, warning, notice, devCode]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus first input box on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Mask corporate email for clean privacy display (e.g. el***@company.com)
  const maskEmail = (rawEmail) => {
    if (!rawEmail || !rawEmail.includes('@')) return rawEmail || 'your email';
    const [user, domain] = rawEmail.split('@');
    if (user.length <= 2) return `${user}***@${domain}`;
    return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
  };

  const handleDigitChange = (index, value) => {
    // Only accept numeric characters
    const numeric = value.replace(/\D/g, '');
    if (!numeric && value !== '') return;

    const newDigits = [...digits];

    if (numeric.length > 1) {
      // Handle paste in a single box
      const pasteDigits = numeric.slice(0, 6).split('');
      pasteDigits.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setDigits(newDigits);
      const nextFocus = Math.min(index + pasteDigits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    newDigits[index] = numeric;
    setDigits(newDigits);
    setError('');

    // Advance focus if single digit entered
    if (numeric && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back to previous input and clear
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pastedData) return;

    const pasteDigits = pastedData.slice(0, 6).split('');
    const newDigits = ['', '', '', '', '', ''];
    pasteDigits.forEach((d, i) => {
      newDigits[i] = d;
    });
    setDigits(newDigits);
    setError('');

    const nextFocus = Math.min(pasteDigits.length, 5);
    inputRefs.current[nextFocus]?.focus();
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 6) {
      setError(lang === 'hi' ? 'कृपया सभी 6 अंक दर्ज करें।' : lang === 'gu' ? 'કૃપા કરીને બધા 6 અંકો દાખલ કરો.' : 'Please enter the complete 6-digit verification code.');
      return;
    }

    if (!email) {
      setError(lang === 'hi' ? 'ईमेल पता गायब है।' : lang === 'gu' ? 'ઇમેઇલ ખૂટે છે.' : 'Email address is missing. Please sign in again.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await verifyEmailOtp(email, otp);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('aisb_pending_verify_email');
        localStorage.removeItem('aisb_pending_verify_warning');
        localStorage.removeItem('aisb_pending_verify_notice');
        localStorage.removeItem('aisb_pending_verify_dev_code');
      }
      showToast(lang === 'hi' ? 'ईमेल सफलतापूर्वक सत्यापित हुआ!' : lang === 'gu' ? 'ઇમેઇલ સફળતાપૂર્વક ચકાસાયો!' : 'Email verified successfully! Welcome to RootForge.');
      navigate('/app/workspaces');
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending || !email) return;

    try {
      setResending(true);
      setError('');
      const res = await resendVerificationOtp(email);
      setCooldown(res.cooldownSeconds || 30);
      if (res.warning) {
        setWarning(res.warning);
        setNotice(res.message);
      }
      if (res.devCode) {
        setDevCode(res.devCode);
      }
      showToast(res.warning ? res.warning : (lang === 'hi' ? 'नया सत्यापन कोड भेजा गया!' : lang === 'gu' ? 'નવો ચકાસણી કોડ મોકલ્યો!' : 'A fresh 6-digit verification code has been sent.'), res.warning ? 'warning' : 'info');
    } catch (err) {
      setError(err.message || 'Failed to resend verification code.');
      if (err.cooldownRemaining) {
        setCooldown(err.cooldownRemaining);
      }
    } finally {
      setResending(false);
    }
  };

  const isComplete = digits.every((d) => d !== '');

  return (
    <div className="auth-page-container">
      {/* Top Controls Header */}
      <header className="app-top-header">
        <TopControls />
      </header>

      <div className="auth-card-wrapper" style={{ maxWidth: 480 }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}>
            <RootForgeLogo size="lg" variant={theme === 'dark' ? 'light' : 'dark'} subtitle="SECURITY VERIFICATION" />
          </div>
          <h1 className="auth-heading" style={{ fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', marginBottom: 6 }}>
            {lang === 'hi' ? 'अपना ईमेल सत्यापित करें' : lang === 'gu' ? 'તમારું ઇમેઇલ ચકાસો' : 'Verify Your Corporate Email'}
          </h1>
          <p className="auth-subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {lang === 'hi' ? 'हमने 6-अंकीय सत्यापन कोड भेजा है:' : lang === 'gu' ? 'અમે 6-અંકનો ચકાસણી કોડ મોકલ્યો છે:' : "We've sent a 6-digit verification code to:"}
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            padding: '6px 14px',
            borderRadius: 20,
            marginTop: 6,
            fontSize: '0.88rem',
            fontWeight: 600,
            color: '#D97706'
          }}>
            <Mail size={14} />
            <span>{maskEmail(email)}</span>
          </div>
        </div>

        {/* Advisory / Warning Notice (Brevo IP Authorization or Delivery Issue) */}
        {warning && (
          <div style={{
            marginBottom: 18,
            padding: '14px 16px',
            borderRadius: 10,
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            fontSize: '0.86rem',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            border: '1px solid #FCD34D',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.1)'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2, color: '#D97706' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: '#B45309', fontSize: '0.9rem' }}>
                🚨 Brevo Blocked Real Email Delivery
              </div>
              <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#78350F' }}>
                {warning}
              </div>
              
              {devCode && (
                <div style={{
                  background: 'rgba(217, 119, 6, 0.15)',
                  border: '1px dashed #D97706',
                  padding: '10px 14px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 10
                }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#92400E' }}>
                    Your Verification Code (Dev):
                  </span>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    letterSpacing: '3px',
                    color: '#B45309'
                  }}>
                    {devCode}
                  </span>
                </div>
              )}

              <div style={{ fontSize: '0.78rem', marginTop: 10, color: '#92400E', lineHeight: 1.4 }}>
                👉 <strong>To receive real emails in your inbox:</strong> Open <a href="https://app.brevo.com/security/authorised_ips" target="_blank" rel="noreferrer" style={{ color: '#B45309', fontWeight: 700, textDecoration: 'underline' }}>Brevo Authorized IPs Settings</a> and disable IP filtering or add your current IP address.
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            fontSize: '0.85rem',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            border: '1px solid #FCA5A5'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* OTP Input Card */}
        <div className="card" style={{ padding: 'clamp(20px, 5vw, 32px)', boxShadow: 'var(--shadow-md)', width: '100%', boxSizing: 'border-box' }}>
          <form onSubmit={handleVerify}>
            {/* 6 Digit Input Group */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'clamp(6px, 2vw, 12px)',
                marginBottom: 24
              }}
              onPaste={handlePaste}
            >
              {digits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-digit-${index}`}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e.key)}
                  aria-label={`Verification digit ${index + 1}`}
                  style={{
                    width: 'clamp(38px, 11vw, 50px)',
                    height: 'clamp(46px, 13vw, 58px)',
                    fontSize: 'clamp(1.2rem, 3.5vw, 1.5rem)',
                    fontWeight: 700,
                    textAlign: 'center',
                    borderRadius: 8,
                    border: digit ? '2px solid #D97706' : '1.5px solid var(--border-subtle)',
                    backgroundColor: digit ? 'var(--bg-card)' : 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: digit ? '0 0 0 2px rgba(217, 119, 6, 0.2)' : 'none'
                  }}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              id="verify-email-submit-btn"
              type="submit"
              disabled={loading || !isComplete}
              className="btn btn-primary"
              style={{
                width: '100%',
                minHeight: 48,
                padding: '12px 0',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: (!isComplete && !loading) ? 0.6 : 1,
                cursor: (!isComplete && !loading) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>{lang === 'hi' ? 'सत्यापित कर रहा है...' : lang === 'gu' ? 'ચકાસી રહ્યું છે...' : 'Verifying Code...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>{lang === 'hi' ? 'ईमेल सत्यापित करें' : lang === 'gu' ? 'ઇમેઇલ ચકાસો' : 'Verify Email & Sign In'}</span>
                </>
              )}
            </button>
          </form>

          {/* Resend OTP Section with 30s Cooldown */}
          <div style={{
            marginTop: 20,
            paddingTop: 18,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {lang === 'hi' ? 'कोड नहीं मिला?' : lang === 'gu' ? 'કોડ મળ્યો નથી?' : "Didn't receive the code?"}
            </div>

            <button
              type="button"
              disabled={cooldown > 0 || resending}
              onClick={handleResend}
              style={{
                background: 'transparent',
                border: 'none',
                color: cooldown > 0 ? 'var(--text-muted)' : '#D97706',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px'
              }}
            >
              <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
              {cooldown > 0
                ? (lang === 'hi' ? `${cooldown}s में पुनः भेजें` : lang === 'gu' ? `${cooldown}s માં ફરી મોકલો` : `Resend code in ${cooldown}s`)
                : (lang === 'hi' ? 'नया कोड भेजें (Resend OTP)' : lang === 'gu' ? 'નવો કોડ મોકલો (Resend OTP)' : 'Resend OTP')}
            </button>

            {/* Back to Login / Change Email Link */}
            <div style={{ marginTop: 6 }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                  textDecoration: 'none'
                }}
              >
                <ArrowLeft size={14} />
                <span>{lang === 'hi' ? 'ईमेल बदलें / वापस लॉगिन करें' : lang === 'gu' ? 'ઇમેઇલ બદલો / સાઇન ઇન પર પાછા જાઓ' : 'Change email or return to sign in'}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
