import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { showToast } from '../../components/common/Toast';
import {
  Settings,
  Cpu,
  Globe,
  Shield,
  Key,
  Save,
  CheckCircle2,
  Lock,
  Sun,
  Moon,
  Wifi
} from 'lucide-react';
import { getApiServerUrl, setApiServerUrl } from '../../services/api';

export const SettingsPage = () => {
  const { user } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [aiProvider, setAiProvider] = useState('DEMO');
  const [apiKey, setApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [customServerUrl, setCustomServerUrl] = useState(() => getApiServerUrl());

  const handleSaveAIConfig = (e) => {
    e.preventDefault();
    showToast('AI Provider preferences saved locally.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860 }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{t.settings.title}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {lang === 'hi' ? 'अपने एआई मॉडल प्रदाता अमूर्तन, स्थानीयकरण और खाता सेटिंग्स का प्रबंधन करें' : lang === 'gu' ? 'તમારા એઆઈ મોડેલ પ્રદાતા અમૂર્તતા, સ્થાનિકીકરણ અને એકાઉન્ટ સેટિંગ્સનું સંચાલન કરો' : 'Manage your AI model provider abstraction, localization, and account settings'}
        </p>
      </div>

      {/* AI Provider Settings */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Cpu size={20} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t.settings.aiProviderTitle}</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          {lang === 'hi'
            ? 'रूटफोर्ज में एक अंतर्निहित नियतात्मक डेमो इंटेलिजेंस इंजन शामिल है जो बाहरी एपीआई निर्भरता के बिना लगातार एंटरप्राइज आर्किटेक्चर तैयार करता है। आप नीचे एक बाहरी एलएलएम एपीआई कुंजी भी जोड़ सकते हैं।'
            : lang === 'gu'
            ? 'રૂટફોર્જમાં બિલ્ટ-ઇન ડેમો ઇન્ટેલિજન્સ એન્જિન સામેલ છે જે બાહ્ય એપીઆઈ નિર્ભરતા વિના સુસંગત એન્ટરપ્રાઇઝ આર્કિટેક્ચર બનાવે છે. તમે નીચે બાહ્ય એલએલએમ એપીઆઈ કી પણ કનેક્ટ કરી શકો છો.'
            : 'RootForge includes a built-in deterministic demo intelligence engine that produces consistent, customized enterprise architectures without external API dependencies. You may also connect an external LLM API key below.'}
        </p>

        <form onSubmit={handleSaveAIConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">{t.settings.providerSelect}</label>
            <select
              className="form-select"
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
            >
              <option value="DEMO">{lang === 'hi' ? 'नियतात्मक एंटरप्राइज डेमो इंजन (अंतर्निहित)' : lang === 'gu' ? 'એન્ટરપ્રાઇઝ ડેમો એન્જિન (બિલ્ટ-ઇન)' : 'Deterministic Enterprise Demo Engine (Built-in)'}</option>
              <option value="OPENAI">OpenAI API (GPT-4o / GPT-4o-mini)</option>
              <option value="GEMINI">Google Gemini API (Gemini 2.5 Flash / Pro)</option>
              <option value="ANTHROPIC">Anthropic Claude API (Claude 3.5 Sonnet)</option>
            </select>
          </div>

          {aiProvider !== 'DEMO' && (
            <div className="grid-responsive-2col" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">{t.settings.apiKeyLabel}</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="form-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.settings.modelLabel}</label>
                <input
                  type="text"
                  placeholder="e.g. gpt-4o or gemini-2.5-flash"
                  className="form-input"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <button type="submit" className="btn btn-primary btn-sm" style={{ minHeight: 44, padding: '0 18px' }}>
              <Save size={14} /> {t.settings.saveSettings}
            </button>
          </div>
        </form>
      </div>

      {/* Theme & Appearance Settings */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {theme === 'dark' ? <Moon size={20} color="var(--accent-amber)" /> : <Sun size={20} color="var(--accent-amber)" />}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            {lang === 'hi' ? 'दिखावट और थीम' : lang === 'gu' ? 'દેખાવ અને થીમ' : 'Theme & Appearance'}
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          {lang === 'hi'
            ? 'अपनी पसंद के अनुसार लाइट या डार्क थीम चुनें। संपूर्ण वेबसाइट तुरंत अनुकूलित हो जाएगी।'
            : lang === 'gu'
            ? 'તમારી પસંદગી મુજબ લાઇટ અથવા ડાર્ક થીમ પસંદ કરો. સમગ્ર વેબસાઇટ તરત જ રૂપાંતરિત થઈ જશે.'
            : 'Choose between Light and Dark theme. The entire website interface adapts instantly.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16 }}>
          {/* Light Mode Option */}
          <div
            onClick={(e) => {
              setTheme('light', e);
              showToast(lang === 'hi' ? 'लाइट थीम सक्रिय है' : lang === 'gu' ? 'લાઇટ થીમ સક્રિય છે' : 'Light theme activated');
            }}
            style={{
              cursor: 'pointer',
              padding: 16,
              borderRadius: 'var(--radius-lg)',
              border: theme === 'light' ? '2px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
              backgroundColor: theme === 'light' ? 'var(--bg-subtle)' : 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#FAF8F5',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sun size={20} color="#D97706" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {lang === 'hi' ? 'लाइट थीम' : lang === 'gu' ? 'લાઇટ થીમ' : 'Light Theme'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {lang === 'hi' ? 'क्लासिक कार्यकारी लेआउट' : lang === 'gu' ? 'ક્લાસિક એન્ટરપ્રાઇઝ શૈલી' : 'Classic enterprise clarity'}
              </div>
            </div>
          </div>

          {/* Dark Mode Option */}
          <div
            onClick={(e) => {
              setTheme('dark', e);
              showToast(lang === 'hi' ? 'डार्क थीम सक्रिय है' : lang === 'gu' ? 'ડાર્ક થીમ સક્રિય છે' : 'Dark theme activated');
            }}
            style={{
              cursor: 'pointer',
              padding: 16,
              borderRadius: 'var(--radius-lg)',
              border: theme === 'dark' ? '2px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
              backgroundColor: theme === 'dark' ? 'var(--bg-subtle)' : 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Moon size={20} color="#F59E0B" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {lang === 'hi' ? 'डार्क थीम' : lang === 'gu' ? 'ડાર્ક થીમ' : 'Dark Theme'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {lang === 'hi' ? 'गहरे विपरीत आधुनिक रूप' : lang === 'gu' ? 'આધુનિક હાઇ-કોન્ટ્રાસ્ટ શૈલી' : 'Deep contrast modern mode'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Localization Settings */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Globe size={20} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t.settings.languageTitle}</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          {t.settings.selectLang}
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { code: 'en', label: 'English (Default)', native: 'English' },
            { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
            { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' }
          ].map((item) => (
            <button
              key={item.code}
              onClick={() => {
                setLang(item.code);
                showToast(item.code === 'hi' ? 'भाषा बदलकर हिन्दी कर दी गई है' : item.code === 'gu' ? 'ભાષા બદલીને ગુજરાતી કરવામાં આવી છે' : `Language switched to ${item.native}`);
              }}
              className={lang === item.code ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '10px 18px', fontSize: '0.85rem' }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{item.native}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{item.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile & API Gateway Settings */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Wifi size={20} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Mobile & API Gateway Connection</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Configure the RootForge backend server endpoint for this Android mobile client. In production, this points to your secure HTTPS enterprise gateway.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Backend Host URL</label>
            <input
              type="text"
              className="form-input"
              value={customServerUrl}
              onChange={(e) => setCustomServerUrl(e.target.value)}
              placeholder="e.g. https://rootforge.onrender.com"
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setCustomServerUrl('https://rootforge.onrender.com')}
            >
              Production Render (rootforge.onrender.com)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setCustomServerUrl('http://10.0.2.2:5005')}
            >
              Android Emulator (10.0.2.2:5005)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setCustomServerUrl('')}
            >
              Default Production Gateway
            </button>
          </div>
          <div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setApiServerUrl(customServerUrl);
                showToast('API Gateway endpoint saved.');
              }}
            >
              <Save size={14} /> Save Gateway Endpoint
            </button>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Shield size={20} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t.settings.accountSecurity}</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
          <div>{t.settings.signedInAs} <strong>{user?.name}</strong> ({user?.email})</div>
          <div>{t.settings.organization} <strong>{user?.organization?.name || 'Acme Retail Global'}</strong></div>
          <div>{t.settings.rolePrivilege} <span className="badge badge-amber">{user?.role || 'CONSULTANT'}</span></div>
        </div>
      </div>
    </div>
  );
};
