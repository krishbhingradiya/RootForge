import React from 'react';

/**
 * Checks whether an assistant message is an initial welcome greeting.
 */
export function isInitialWelcomeMessage(message) {
  if (!message) return false;
  const content = typeof message === 'string' ? message : (message.content || '');
  if (typeof content !== 'string') return false;
  const text = content.trim();
  return (
    text.startsWith('Started a new') ||
    text.startsWith('Welcome to the') ||
    text.startsWith('Welcome to ') ||
    text.includes('canonical workspace context and uploaded documents') ||
    text.includes('cataloged your initial objective')
  );
}

/**
 * Safely parses inline markdown (code, bold, italic) into styled JSX elements.
 */
function renderInlineFormatting(inlineText) {
  if (!inlineText || typeof inlineText !== 'string') return inlineText;

  // Split by code blocks (`code`)
  const codeParts = inlineText.split(/(`[^`]+`)/g);
  return codeParts.map((codePart, ci) => {
    if (codePart.startsWith('`') && codePart.endsWith('`') && codePart.length > 2) {
      return (
        <code
          key={`code-${ci}`}
          style={{
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            color: 'var(--accent-amber-text, #B45309)',
            padding: '2px 5px',
            borderRadius: 4,
            fontSize: '0.85em',
            fontFamily: 'monospace'
          }}
        >
          {codePart.slice(1, -1)}
        </code>
      );
    }

    // Split by bold (**bold**)
    const boldParts = codePart.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((boldPart, bi) => {
      if (boldPart.startsWith('**') && boldPart.endsWith('**') && boldPart.length > 4) {
        return (
          <strong key={`b-${ci}-${bi}`} style={{ fontWeight: 700, color: 'inherit' }}>
            {boldPart.slice(2, -2)}
          </strong>
        );
      }

      // Split by italic (*italic*)
      const italicParts = boldPart.split(/(\*[^*]+\*)/g);
      if (italicParts.length > 1) {
        return italicParts.map((sub, ii) => {
          if (sub.startsWith('*') && sub.endsWith('*') && sub.length > 2) {
            return (
              <em key={`em-${ci}-${bi}-${ii}`} style={{ fontStyle: 'italic' }}>
                {sub.slice(1, -1)}
              </em>
            );
          }
          return sub;
        });
      }

      return boldPart;
    });
  });
}

/**
 * Safely parses and renders text with headers, bullet points, numbered lists,
 * and inline markdown (bold/italic/code) into styled JSX elements,
 * preventing literal `**`, `*`, or `###` characters from appearing raw in the UI.
 */
export function renderFormattedText(text) {
  if (!text || typeof text !== 'string') return text;

  let cleanText = text.trim();
  if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleanText);
      if (parsed && typeof parsed.summary === 'string') {
        cleanText = parsed.summary;
      }
    } catch {}
  }

  const lines = cleanText.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4
          key={`h3-${i}`}
          style={{
            fontSize: '0.88rem',
            fontWeight: 700,
            marginTop: elements.length > 0 ? 10 : 0,
            marginBottom: 4,
            color: 'var(--text-primary)',
            letterSpacing: '0.01em'
          }}
        >
          {renderInlineFormatting(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3
          key={`h2-${i}`}
          style={{
            fontSize: '0.94rem',
            fontWeight: 700,
            marginTop: elements.length > 0 ? 12 : 0,
            marginBottom: 6,
            color: 'var(--text-primary)'
          }}
        >
          {renderInlineFormatting(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2
          key={`h1-${i}`}
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            marginTop: elements.length > 0 ? 14 : 0,
            marginBottom: 6,
            color: 'var(--text-primary)'
          }}
        >
          {renderInlineFormatting(trimmed.slice(2))}
        </h2>
      );
    } else if (/^[-*]\s+/.test(trimmed)) {
      // Unordered list item
      elements.push(
        <div
          key={`li-${i}`}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            marginLeft: 8,
            marginTop: 2,
            marginBottom: 2,
            fontSize: 'inherit',
            lineHeight: 1.5
          }}
        >
          <span style={{ color: 'var(--accent-amber, #D97706)', fontWeight: 700, fontSize: '0.9em' }}>•</span>
          <div style={{ flex: 1 }}>{renderInlineFormatting(trimmed.replace(/^[-*]\s+/, ''))}</div>
        </div>
      );
    } else if (/^\d+\.\s+/.test(trimmed)) {
      // Ordered list item
      const numMatch = trimmed.match(/^(\d+)\.\s+/);
      const num = numMatch ? numMatch[1] : '1';
      elements.push(
        <div
          key={`oli-${i}`}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            marginLeft: 8,
            marginTop: 2,
            marginBottom: 2,
            fontSize: 'inherit',
            lineHeight: 1.5
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.8em', minWidth: 16 }}>{num}.</span>
          <div style={{ flex: 1 }}>{renderInlineFormatting(trimmed.replace(/^\d+\.\s+/, ''))}</div>
        </div>
      );
    } else if (!trimmed) {
      // Empty line -> small vertical spacer
      elements.push(<div key={`sp-${i}`} style={{ height: 6 }} />);
    } else {
      // Standard paragraph line
      elements.push(
        <div key={`p-${i}`} style={{ lineHeight: 1.5, marginBottom: 2 }}>
          {renderInlineFormatting(line)}
        </div>
      );
    }
  }

  return <>{elements}</>;
}
