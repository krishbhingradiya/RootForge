import React from 'react';
import { Sparkles, X, AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Dedicated React Error Boundary for the AI Copilot Chatbot.
 * 
 * Guarantees:
 * 1. The chatbot can NEVER turn the rest of RootForge into a black/blank screen.
 * 2. If an exception occurs, shows the graceful RootForge fallback UI:
 *    "AI Copilot could not load."
 *    "Check your connection and try again."
 *    [Retry]
 * 3. The user can dismiss the drawer via [X] or retry.
 */
export class AiChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AiChatErrorBoundary] Caught error in AI Copilot:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack
    });
  }

  componentDidUpdate(prevProps) {
    // When drawer is closed and re-opened, reset error state to allow clean retry
    if (prevProps.isOpen && !this.props.isOpen && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // If drawer is closed, don't show the error overlay
      if (!this.props.isOpen) return null;

      return (
        <>
          <div
            className="ai-consultant-backdrop"
            onClick={this.props.onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(11, 15, 23, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 99
            }}
          />
          <div
            className="ai-consultant-drawer"
            role="dialog"
            aria-label="AI Copilot Error"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 460,
              maxWidth: '100vw',
              height: '100dvh',
              backgroundColor: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 100,
              paddingTop: 'var(--sat, 0px)'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#1E232D',
                color: '#FAF8F5'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    backgroundColor: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Sparkles size={16} color="#FFFFFF" />
                </div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>AI Copilot</span>
                  <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Autonomous Assistant</div>
                </div>
              </div>
              {this.props.onClose && (
                <button
                  type="button"
                  onClick={this.props.onClose}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label="Close AI Copilot"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Error Content */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 24px',
                textAlign: 'center',
                gap: 16
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  AI Copilot could not load.
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>
                  Check your connection and try again.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 20px',
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Retry</span>
                </button>
                {this.props.onClose && (
                  <button
                    type="button"
                    onClick={this.props.onClose}
                    className="btn btn-secondary"
                    style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      );
    }

    return this.props.children;
  }
}
