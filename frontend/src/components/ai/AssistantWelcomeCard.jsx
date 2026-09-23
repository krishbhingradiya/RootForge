import React from 'react';
import { Bot, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const STAGE_TITLES = {
  en: {
    overview: 'Welcome to Overview',
    discovery: 'Welcome to Discovery',
    analysis: 'Welcome to Business Analysis',
    solution: 'Welcome to Solution Builder',
    solutions: 'Welcome to Solution Builder',
    architecture: 'Welcome to Architecture',
    process: 'Welcome to Process Design',
    ux: 'Welcome to UX Design',
    database: 'Welcome to Database & APIs',
    api: 'Welcome to Database & APIs',
    planning: 'Welcome to Planning'
  },
  hi: {
    overview: 'अवलोकन में आपका स्वागत है',
    discovery: 'डिस्कवरी में आपका स्वागत है',
    analysis: 'व्यावसायिक विश्लेषण में आपका स्वागत है',
    solution: 'समाधान निर्माता में आपका स्वागत है',
    solutions: 'समाधान निर्माता में आपका स्वागत है',
    architecture: 'आर्किटेक्चर में आपका स्वागत है',
    process: 'प्रक्रिया डिज़ाइन में आपका स्वागत है',
    ux: 'यूएक्स डिज़ाइन में आपका स्वागत है',
    database: 'डेटाबेस व एपीआई में आपका स्वागत है',
    api: 'डेटाबेस व एपीआई में आपका स्वागत है',
    planning: 'योजना में आपका स्वागत है'
  },
  gu: {
    overview: 'વિહંગાવલોકનમાં આપનું સ્વાગત છે',
    discovery: 'ડિસ્કવરીમાં આપનું સ્વાગત છે',
    analysis: 'બિઝનેસ વિશ્લેષણમાં આપનું સ્વાગત છે',
    solution: 'સોલ્યુશન બિલ્ડરમાં આપનું સ્વાગત છે',
    solutions: 'સોલ્યુશન બિલ્ડરમાં આપનું સ્વાગત છે',
    architecture: 'આર્કિટેક્ચરમાં આપનું સ્વાગત છે',
    process: 'પ્રક્રિયા ડિઝાઇનમાં આપનું સ્વાગત છે',
    ux: 'યુએક્સ ડિઝાઇનમાં આપનું સ્વાગત છે',
    database: 'ડેટાબેઝ અને એપીઆઈમાં આપનું સ્વાગત છે',
    api: 'ડેટાબેઝ અને એપીઆઈમાં આપનું સ્વાગત છે',
    planning: 'પ્લાનિંગમાં આપનું સ્વાગત છે'
  }
};

const STAGE_CAPABILITIES = {
  en: {
    overview: [
      'Business requirements',
      'Operational bottlenecks',
      'Stakeholders and users',
      'Success metrics',
      'Constraints and assumptions',
      'Solution opportunities'
    ],
    discovery: [
      'Business requirements',
      'Operational bottlenecks',
      'Stakeholders and users',
      'Success metrics',
      'Constraints and assumptions',
      'Solution opportunities'
    ],
    analysis: [
      'Current vs. future state analysis',
      'Digital maturity assessment',
      'Enterprise pain points',
      'Stakeholder personas',
      'Functional & technical requirements',
      'Automation opportunities'
    ]
  },
  hi: {
    overview: [
      'व्यावसायिक आवश्यकताएँ',
      'परिचालन संबंधी बाधाएँ',
      'हितधारक और उपयोगकर्ता',
      'सफलता के मेट्रिक्स',
      'बाधाएँ और धारणाएँ',
      'समाधान के अवसर'
    ],
    discovery: [
      'व्यावसायिक आवश्यकताएँ',
      'परिचालन संबंधी बाधाएँ',
      'हितधारक और उपयोगकर्ता',
      'सफलता के मेट्रिक्स',
      'बाधाएँ और धारणाएँ',
      'समाधान के अवसर'
    ],
    analysis: [
      'वर्तमान बनाम भविष्य स्थिति विश्लेषण',
      'डिजिटल परिपक्वता मूल्यांकन',
      'एंटरप्राइज दर्द बिंदु',
      'हितधारक व्यक्तित्व',
      'कार्यात्मक व तकनीकी आवश्यकताएं',
      'स्वचालन के अवसर'
    ]
  },
  gu: {
    overview: [
      'બિઝનેસ જરૂરિયાતો',
      'ઓપરેશનલ અવરોધો',
      'હિતધારકો અને વપરાશકર્તાઓ',
      'સફળતાના મેટ્રિક્સ',
      'મર્યાદાઓ અને ધારણાઓ',
      'સોલ્યુશનની તકો'
    ],
    discovery: [
      'બિઝનેસ જરૂરિયાતો',
      'ઓપરેશનલ અવરોધો',
      'હિતધારકો અને વપરાશકર્તાઓ',
      'સફળતાના મેટ્રિક્સ',
      'મર્યાદાઓ અને ધારણાઓ',
      'સોલ્યુશનની તકો'
    ],
    analysis: [
      'વર્તમાન વિરુદ્ધ ભવિષ્યની સ્થિતિ વિશ્લેષણ',
      'ડિજિટલ પરિપક્વતા મૂલ્યાંકન',
      'એન્ટરપ્રાઇઝ મુશ્કેલીઓ',
      'હિતધારક વ્યક્તિત્વ',
      'કાર્યાત્મક અને તકનીકી જરૂરિયાતો',
      'ઓટોમેશન તકો'
    ]
  }
};

const STAGE_CHIPS = {
  en: {
    overview: [
      'Business requirements',
      'Operational bottlenecks',
      'Success metrics',
      'Constraints and assumptions'
    ],
    discovery: [
      'Business requirements',
      'Operational bottlenecks',
      'Success metrics',
      'Constraints and assumptions'
    ],
    analysis: [
      'Current bottlenecks',
      'Digital maturity',
      'Stakeholder personas',
      'Automation opportunities'
    ]
  },
  hi: {
    overview: [
      'व्यावसायिक आवश्यकताएँ',
      'परिचालन बाधाएँ',
      'सफलता मेट्रिक्स',
      'बाधाएँ और धारणाएँ'
    ],
    discovery: [
      'व्यावसायिक आवश्यकताएँ',
      'परिचालन बाधाएँ',
      'सफलता मेट्रिक्स',
      'बाधाएँ और धारणाएँ'
    ],
    analysis: [
      'वर्तमान बाधाएँ',
      'डिजिटल परिपक्वता',
      'हितधारक व्यक्तित्व',
      'स्वचालन अवसर'
    ]
  },
  gu: {
    overview: [
      'બિઝનેસ જરૂરિયાતો',
      'ઓપરેશનલ અવરોધો',
      'સફળતા મેટ્રિક્સ',
      'મર્યાદાઓ અને ધારણાઓ'
    ],
    discovery: [
      'બિઝનેસ જરૂરિયાતો',
      'ઓપરેશનલ અવરોધો',
      'સફળતા મેટ્રિક્સ',
      'મર્યાદાઓ અને ધારણાઓ'
    ],
    analysis: [
      'વર્તમાન અવરોધો',
      'ડિજિટલ પરિપક્વતા',
      'હિતધારક પાત્રો',
      'ઓટોમેશન તકો'
    ]
  }
};

/**
 * Enterprise Assistant Welcome Card
 * Provides a polished, ChatGPT-style greeting for new conversations with dynamic stage,
 * dynamic workspace name, dynamic document grounding counts, and complete multilingual support.
 */
export const AssistantWelcomeCard = ({
  stage = 'discovery',
  workspace = null,
  documentCount = null,
  onSelectPrompt = null,
  compact = false
}) => {
  const { lang, t } = useLanguage();
  const currentLang = lang === 'hi' || lang === 'gu' ? lang : 'en';

  const normalizedStage = (stage || 'discovery').toLowerCase().trim();
  const langTitles = STAGE_TITLES[currentLang] || STAGE_TITLES.en;
  const stageTitle = langTitles[normalizedStage] || STAGE_TITLES.en[normalizedStage] || `Welcome to ${normalizedStage.charAt(0).toUpperCase() + normalizedStage.slice(1)}`;
  
  // Clean workspace name (strip any accidental markdown symbols)
  let rawWsName = workspace?.name || 'Current Workspace';
  if (workspace?.id === 'ws-demo-customer-support' || workspace?.isDemo) {
    if (currentLang === 'hi') rawWsName = 'ग्राहक सहायता रूपांतरण';
    else if (currentLang === 'gu') rawWsName = 'ગ્રાહક સહાયતા રૂપાંતરણ';
  }
  const cleanWsName = rawWsName.replace(/\*\*/g, '').replace(/__/g, '').replace(/`/g, '').trim();

  // Dynamic document grounding count
  const docCount = documentCount !== null && documentCount !== undefined
    ? Number(documentCount)
    : (workspace?.documentsCount ?? workspace?._count?.documents ?? workspace?.documents?.length ?? 0);

  let docGroundingText = '';
  if (currentLang === 'hi') {
    docGroundingText = docCount > 0
      ? `मैं आपके कार्यस्थान संदर्भ और ${docCount} अनुक्रमित दस्तावेज़ों पर आधारित हूँ।`
      : 'मैं आपके कार्यस्थान संदर्भ पर आधारित हूँ। अभी तक कोई दस्तावेज़ अनुक्रमित नहीं है।';
  } else if (currentLang === 'gu') {
    docGroundingText = docCount > 0
      ? `હું તમારા કાર્યસ્થળ સંદર્ભ અને ${docCount} અનુક્રમિત દસ્તાવેજો પર આધારિત છું.`
      : 'હું તમારા કાર્યસ્થળ સંદર્ભ પર આધારિત છું. હજી સુધી કોઈ દસ્તાવેજ અનુક્રમિત નથી.';
  } else {
    docGroundingText = docCount > 1
      ? `I'm grounded in your workspace context and ${docCount} indexed documents.`
      : docCount === 1
      ? `I'm grounded in your workspace context and 1 indexed document.`
      : `I'm grounded in your workspace context. No documents have been indexed yet.`;
  }

  const langCaps = STAGE_CAPABILITIES[currentLang] || STAGE_CAPABILITIES.en;
  const capabilities = langCaps[normalizedStage] || STAGE_CAPABILITIES.en[normalizedStage] || STAGE_CAPABILITIES.en.discovery;

  const langChips = STAGE_CHIPS[currentLang] || STAGE_CHIPS.en;
  const chips = langChips[normalizedStage] || STAGE_CHIPS.en[normalizedStage] || STAGE_CHIPS.en.discovery;

  return (
    <div
      style={{
        display: 'flex',
        gap: compact ? 10 : 12,
        alignItems: 'flex-start',
        maxWidth: '100%',
        width: '100%',
        alignSelf: 'flex-start',
        boxSizing: 'border-box'
      }}
    >
      {/* AI Assistant Avatar */}
      <div
        style={{
          width: compact ? 28 : 32,
          height: compact ? 28 : 32,
          borderRadius: compact ? 6 : '50%',
          backgroundColor: '#D97706',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2
        }}
      >
        <Bot size={compact ? 16 : 18} />
      </div>

      {/* Welcome Card Surface */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: compact ? '14px 16px' : '18px 22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        {/* Header: Level 1 (Stage Welcome) & Level 2 (Workspace Name) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="var(--accent-amber)" />
            <span
              style={{
                fontSize: compact ? '0.85rem' : '0.92rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em'
              }}
            >
              {stageTitle}
            </span>
          </div>
          <div
            style={{
              fontSize: compact ? '0.95rem' : '1.05rem',
              fontWeight: 700,
              color: 'var(--accent-amber-text, #B45309)',
              marginTop: 3
            }}
          >
            {cleanWsName}
          </div>
        </div>

        {/* Level 3: Context Grounding Explanation */}
        <div
          style={{
            fontSize: compact ? '0.78rem' : '0.84rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: docCount > 0 ? '#10B981' : '#F59E0B',
              display: 'inline-block',
              flexShrink: 0
            }}
          />
          <span>{docGroundingText}</span>
        </div>

        {/* Level 4: Capabilities List */}
        <div>
          <div
            style={{
              fontSize: compact ? '0.75rem' : '0.8rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            {currentLang === 'hi' ? 'मैं निम्नलिखित का पता लगाने में आपकी मदद कर सकता हूँ:' : currentLang === 'gu' ? 'હું નીચેના વિષયોમાં તમારી મદદ કરી શકું છું:' : 'I can help you explore:'}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 4
            }}
          >
            {capabilities.map((cap, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: compact ? '0.78rem' : '0.82rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span style={{ color: 'var(--accent-amber)', fontSize: '0.9rem', lineHeight: 1 }}>•</span>
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Level 5: Closing Prompt */}
        <div
          style={{
            fontSize: compact ? '0.82rem' : '0.88rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginTop: 4
          }}
        >
          {currentLang === 'hi' ? 'आप क्या जानना चाहेंगे?' : currentLang === 'gu' ? 'તમે શું અન્વેષણ કરવા માંગો છો?' : 'What would you like to explore?'}
        </div>

        {/* Level 6: Quick-Start Suggestion Chips (Optional) */}
        {onSelectPrompt && chips && chips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {chips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPrompt(chip)}
                style={{
                  fontSize: compact ? '0.72rem' : '0.76rem',
                  padding: '5px 12px',
                  borderRadius: 9999,
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontWeight: 500,
                  maxWidth: '100%',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  textAlign: 'left',
                  lineHeight: 1.35
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-amber-light)';
                  e.currentTarget.style.borderColor = 'var(--accent-amber)';
                  e.currentTarget.style.color = 'var(--accent-amber-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
