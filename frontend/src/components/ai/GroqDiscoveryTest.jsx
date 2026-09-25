import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, RefreshCw, CheckCircle2, AlertCircle, 
  HelpCircle, Layers, ArrowRight, User, Bot, Clock, 
  MessageSquare, FileText, CheckCircle, ChevronRight
} from 'lucide-react';
import api from '../../services/api';

export const GroqDiscoveryTest = ({ workspaceId = null }) => {
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Active state
  const [initialRequirement, setInitialRequirement] = useState('');
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [completedQA, setCompletedQA] = useState([]); // Array of { question_number, question, answer }
  const [finalRequirements, setFinalRequirements] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);

  const inputRef = useRef(null);

  useEffect(() => {
    initSession();
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const h = await api.getAiDiscoveryHealth();
      setHealthStatus(h);
    } catch (err) {
      console.warn('Health check notice:', err.message);
    }
  };

  const initSession = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.startAiDiscovery();
      if (res && res.sessionId) {
        setSessionId(res.sessionId);
        setCurrentQuestionNumber(0);
        setInitialRequirement('');
        setActiveQuestion(null);
        setCompletedQA([]);
        setFinalRequirements(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize discovery session');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.sendAiDiscoveryMessage(sessionId, trimmed);
      if (res && res.success) {
        // State 0: Initial requirement provided -> Question 1 received
        if (currentQuestionNumber === 0) {
          setInitialRequirement(trimmed);
          setCurrentQuestionNumber(1);
          setActiveQuestion({
            number: 1,
            question: res.question,
            reason: res.question_reason
          });
        }
        // State 1: Answer 1 provided -> Question 2 received
        else if (currentQuestionNumber === 1) {
          setCompletedQA(prev => [
            ...prev,
            { question_number: 1, question: activeQuestion?.question, answer: trimmed }
          ]);
          setCurrentQuestionNumber(2);
          setActiveQuestion({
            number: 2,
            question: res.question,
            reason: res.question_reason
          });
        }
        // State 2: Answer 2 provided -> Question 3 received
        else if (currentQuestionNumber === 2) {
          setCompletedQA(prev => [
            ...prev,
            { question_number: 2, question: activeQuestion?.question, answer: trimmed }
          ]);
          setCurrentQuestionNumber(3);
          setActiveQuestion({
            number: 3,
            question: res.question,
            reason: res.question_reason
          });
        }
        // State 3: Answer 3 provided -> Final synthesis received (Complete)
        else if (currentQuestionNumber === 3) {
          setCompletedQA(prev => [
            ...prev,
            { question_number: 3, question: activeQuestion?.question, answer: trimmed }
          ]);
          setCurrentQuestionNumber(3);
          setActiveQuestion(null);
          setFinalRequirements(res.final_requirements || res);
        }

        setInputMessage('');
      } else {
        setError(res?.error || 'Failed to process message');
      }
    } catch (err) {
      setError(err.message || 'Failed to communicate with discovery engine');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleReset = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await api.resetAiDiscoverySession(sessionId);
      initSession();
    } catch (err) {
      setError(err.message || 'Failed to reset session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 960, margin: '0 auto', color: 'var(--text-primary, #FAF8F5)' }}>
      {/* Header Bar */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-medium, #2A313C)',
          paddingBottom: 16,
          marginBottom: 24
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div 
            style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 12, 
              backgroundColor: 'rgba(217, 119, 6, 0.15)',
              color: 'var(--accent-amber, #D97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(217, 119, 6, 0.3)'
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              AI Business Consultant — Exact 3-Question Discovery
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94A3B8)', margin: 0, marginTop: 2 }}>
              Dynamic 3-turn requirement discovery loop powered by Groq <code style={{ color: '#F59E0B' }}>llama-3.3-70b-versatile</code>.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {healthStatus && (
            <span 
              style={{ 
                fontSize: '0.75rem', 
                padding: '4px 10px', 
                borderRadius: 20, 
                backgroundColor: healthStatus.configured ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: healthStatus.configured ? '#10B981' : '#EF4444',
                border: `1px solid ${healthStatus.configured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                fontWeight: 600
              }}
            >
              {healthStatus.primaryProvider?.toUpperCase()} ACTIVE
            </span>
          )}

          <button 
            type="button"
            onClick={handleReset} 
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '7px 14px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Reset Flow</span>
          </button>
        </div>
      </div>

      {/* Progress Steps Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface, #1E232D)',
          border: '1px solid var(--border-medium, #2A313C)',
          borderRadius: 12,
          padding: '12px 20px',
          marginBottom: 24
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 24, height: 24, borderRadius: '50%', 
            backgroundColor: currentQuestionNumber >= 1 ? '#10B981' : (currentQuestionNumber === 0 ? 'var(--accent-amber)' : 'rgba(255,255,255,0.1)'),
            color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700
          }}>
            {currentQuestionNumber > 0 ? '✓' : '0'}
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: currentQuestionNumber === 0 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
            Initial Requirement
          </span>
        </div>

        <ChevronRight size={16} color="var(--border-medium)" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 24, height: 24, borderRadius: '50%', 
            backgroundColor: completedQA.length >= 1 ? '#10B981' : (currentQuestionNumber === 1 ? 'var(--accent-amber)' : 'rgba(255,255,255,0.1)'),
            color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700
          }}>
            {completedQA.length >= 1 ? '✓' : '1'}
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: currentQuestionNumber === 1 ? 'var(--accent-amber)' : (completedQA.length >= 1 ? '#10B981' : 'var(--text-muted)') }}>
            Question 1 of 3
          </span>
        </div>

        <ChevronRight size={16} color="var(--border-medium)" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 24, height: 24, borderRadius: '50%', 
            backgroundColor: completedQA.length >= 2 ? '#10B981' : (currentQuestionNumber === 2 ? 'var(--accent-amber)' : 'rgba(255,255,255,0.1)'),
            color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700
          }}>
            {completedQA.length >= 2 ? '✓' : '2'}
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: currentQuestionNumber === 2 ? 'var(--accent-amber)' : (completedQA.length >= 2 ? '#10B981' : 'var(--text-muted)') }}>
            Question 2 of 3
          </span>
        </div>

        <ChevronRight size={16} color="var(--border-medium)" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 24, height: 24, borderRadius: '50%', 
            backgroundColor: completedQA.length >= 3 ? '#10B981' : (currentQuestionNumber === 3 && !finalRequirements ? 'var(--accent-amber)' : 'rgba(255,255,255,0.1)'),
            color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700
          }}>
            {completedQA.length >= 3 ? '✓' : '3'}
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: currentQuestionNumber === 3 && !finalRequirements ? 'var(--accent-amber)' : (completedQA.length >= 3 ? '#10B981' : 'var(--text-muted)') }}>
            Question 3 of 3
          </span>
        </div>

        <ChevronRight size={16} color="var(--border-medium)" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 24, height: 24, borderRadius: '50%', 
            backgroundColor: finalRequirements ? '#10B981' : 'rgba(255,255,255,0.1)',
            color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700
          }}>
            ★
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: finalRequirements ? '#10B981' : 'var(--text-muted)' }}>
            Complete
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Step 0: Initial Requirement */}
        {initialRequirement && (
          <div 
            className="card"
            style={{ 
              backgroundColor: 'var(--bg-surface, #1E232D)',
              border: '1px solid var(--border-medium, #2A313C)',
              borderRadius: 12,
              padding: 18
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <User size={16} color="var(--accent-amber)" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-amber)' }}>
                Initial Project Requirement
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {initialRequirement}
            </p>
          </div>
        )}

        {/* Completed Q&A Turns */}
        {completedQA.map((qa, index) => (
          <div 
            key={index}
            style={{
              backgroundColor: 'var(--bg-surface, #1E232D)',
              border: '1px solid var(--border-medium, #2A313C)',
              borderRadius: 12,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            {/* AI Question */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(217, 119, 6, 0.15)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase', marginBottom: 2 }}>
                  Question {qa.question_number} of 3
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {qa.question}
                </div>
              </div>
            </div>

            {/* User Answer */}
            <div style={{ display: 'flex', gap: 12, paddingLeft: 44 }}>
              <div style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle, #2A313C)', borderRadius: 8, padding: '10px 14px', fontSize: '0.88rem', color: 'var(--text-secondary, #CBD5E1)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', marginBottom: 3 }}>
                  Your Answer:
                </div>
                {qa.answer}
              </div>
            </div>
          </div>
        ))}

        {/* Current Active Question (Awaiting User Answer) */}
        {!finalRequirements && activeQuestion && (
          <div 
            style={{
              backgroundColor: 'rgba(217, 119, 6, 0.08)',
              border: '1.5px solid var(--accent-amber, #D97706)',
              borderRadius: 12,
              padding: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(217, 119, 6, 0.2)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                  AI Counter-Question ({activeQuestion.number} of 3)
                </span>
              </div>
            </div>

            <h3 style={{ margin: '4px 0 10px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {activeQuestion.question}
            </h3>

            {activeQuestion.reason && (
              <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Targeting: {activeQuestion.reason}
              </p>
            )}

            {/* Answer Form */}
            <form onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Type your answer to Question ${activeQuestion.number}...`}
                rows={3}
                disabled={loading}
                autoFocus
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-subtle, #181C24)',
                  border: '1px solid var(--border-medium, #2A313C)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />

              {error && (
                <div style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Question {activeQuestion.number} of 3 • Press Enter to submit answer
                </span>
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: 'var(--accent-amber, #D97706)',
                    borderColor: 'var(--accent-amber, #D97706)',
                    color: '#FFFFFF',
                    padding: '8px 20px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Send size={15} />
                  <span>{loading ? 'Submitting to Groq...' : `Submit Answer ${activeQuestion.number}`}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Initial Prompt Input Form (When currentQuestionNumber === 0) */}
        {!initialRequirement && (
          <div 
            className="card"
            style={{
              backgroundColor: 'var(--bg-surface, #1E232D)',
              border: '1px solid var(--border-medium, #2A313C)',
              borderRadius: 12,
              padding: 22
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700 }}>
              Enter Your Project Requirement
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Describe your software idea or business problem. The AI consultant will ask exactly 3 sequential counter-questions to discover the complete scope.
            </p>

            <form onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Example: I want to build an online grocery delivery platform for local stores. Customers should order online and get fast delivery..."
                rows={4}
                disabled={loading}
                autoFocus
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-subtle, #181C24)',
                  border: '1px solid var(--border-medium, #2A313C)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />

              {error && (
                <div style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Supports English, Hindi, and Gujarati.
                </span>
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: 'var(--accent-amber, #D97706)',
                    borderColor: 'var(--accent-amber, #D97706)',
                    color: '#FFFFFF',
                    padding: '10px 24px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Sparkles size={16} />
                  <span>{loading ? 'Starting Discovery...' : 'Start 3-Question Discovery'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Final Discovery Requirements Summary (After Answer 3) */}
        {finalRequirements && (
          <div 
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.06)',
              border: '1.5px solid #10B981',
              borderRadius: 14,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            {/* Header Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(16, 185, 129, 0.25)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={22} color="#10B981" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#10B981' }}>
                    Discovery Complete (All 3 Questions Answered)
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Synthesized by Groq AI Consultant based strictly on user-confirmed requirements.
                  </span>
                </div>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: 20, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981', fontWeight: 700, fontSize: '0.78rem' }}>
                STATUS: COMPLETE
              </span>
            </div>

            {/* Project Summary */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                PROJECT SUMMARY
              </span>
              <p style={{ margin: '6px 0 0', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {finalRequirements.project_summary}
              </p>
            </div>

            {/* Structured Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Problem & Objective */}
              <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle, #2A313C)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-amber)' }}>
                  Business Problem & Objective
                </span>
                <div style={{ marginTop: 6, fontSize: '0.84rem' }}>
                  <strong>Problem: </strong> {finalRequirements.business_problem}
                </div>
                <div style={{ marginTop: 6, fontSize: '0.84rem' }}>
                  <strong>Objective: </strong> {finalRequirements.business_objective}
                </div>
              </div>

              {/* Target Users */}
              <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle, #2A313C)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#3B82F6' }}>
                  Target Users & Roles
                </span>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                  {Array.isArray(finalRequirements.target_users) && finalRequirements.target_users.length > 0 ? (
                    finalRequirements.target_users.map((u, i) => <li key={i}>{u}</li>)
                  ) : (
                    <li>End Users</li>
                  )}
                </ul>
              </div>

              {/* Core Requirements */}
              <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle, #2A313C)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#10B981' }}>
                  Core Requirements & Features
                </span>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                  {Array.isArray(finalRequirements.core_requirements) && finalRequirements.core_requirements.length > 0 ? (
                    finalRequirements.core_requirements.map((r, i) => <li key={i}>{r}</li>)
                  ) : (
                    <li>Core application functionalities</li>
                  )}
                </ul>
              </div>

              {/* Integrations & Workflows */}
              <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle, #2A313C)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#A855F7' }}>
                  Integrations & Workflows
                </span>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                  {Array.isArray(finalRequirements.integrations) && finalRequirements.integrations.length > 0 ? (
                    finalRequirements.integrations.map((it, i) => <li key={i}>{it}</li>)
                  ) : (
                    <li>None specified</li>
                  )}
                </ul>
              </div>
            </div>

            {/* AI Recommendations */}
            {Array.isArray(finalRequirements.ai_recommendations) && finalRequirements.ai_recommendations.length > 0 && (
              <div style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: 10, padding: 14 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-amber)' }}>
                  AI Architectural Recommendations (Distinct from User Requirements)
                </span>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                  {finalRequirements.ai_recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                </ul>
              </div>
            )}

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary"
                style={{ padding: '9px 18px', fontSize: '0.88rem' }}
              >
                Start New 3-Question Discovery
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroqDiscoveryTest;
