import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Shield,
  FileText,
  Clock,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

export const ConfigRulesScreenView = ({
  screen,
  allScreens,
  domain,
  deviceView,
  isPrototype = false,
  onTriggerAction
}) => {
  const isMobile = deviceView === 'mobile';
  const [activeTab, setActiveTab] = useState('rules');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newAction, setNewAction] = useState('');
  const [notice, setNotice] = useState(null);

  const isCyber = /cyber|soc|threat|incident/i.test(domain + ' ' + screen.name);
  const isLogistics = /logistics|supply|fleet|dispatch|vehicle|driver/i.test(domain + ' ' + screen.name);
  const isFintech = /fraud|fintech|bank|transaction/i.test(domain + ' ' + screen.name);

  // Initial Rules List
  const initialRules = isCyber ? [
    {
      id: 'POL-CYBER-01',
      name: 'Ransomware C2 Auto-Containment',
      condition: 'IF outbound_dns_matches_iocs == TRUE AND confidence >= 95%',
      action: 'Isolate Host from Network & Revoke Kerberos Session',
      status: true,
      lastEvaluated: '1m ago',
      evalCount: '14,280/day'
    },
    {
      id: 'POL-CYBER-02',
      name: 'Tor Relay SSH Auth Quarantine',
      condition: 'IF failed_auth_attempts > 50 in 60s FROM ip_is_tor == TRUE',
      action: 'Add IP to Boundary Firewall Drop ACL for 24 hours',
      status: true,
      lastEvaluated: '4m ago',
      evalCount: '8,400/day'
    },
    {
      id: 'POL-CYBER-03',
      name: 'Privilege Escalation Alert Escalation',
      condition: 'IF process_spawns_system == TRUE AND user_role != "Domain Admin"',
      action: 'Page Tier-3 Incident Commander & Dump RAM',
      status: false,
      lastEvaluated: '12m ago',
      evalCount: '3,100/day'
    }
  ] : isLogistics ? [
    {
      id: 'POL-LOG-01',
      name: 'Dynamic Traffic Waypoint Re-sequencing',
      condition: 'IF route_delay_mins >= 18m AND alternate_eta_savings >= 8m',
      action: 'Update Driver Turn-by-Turn GPS and Push In-Cab Alert',
      status: true,
      lastEvaluated: '2m ago',
      evalCount: '4,890/day'
    },
    {
      id: 'POL-LOG-02',
      name: 'Refrigerated Cold-Chain Breach Warning',
      condition: 'IF cargo_temp > 6.0°C FOR duration > 10m',
      action: 'Trigger High-Priority Fleet Dispatch Alert & Notify Recipient',
      status: true,
      lastEvaluated: '6m ago',
      evalCount: '1,240/day'
    },
    {
      id: 'POL-LOG-03',
      name: 'Driver Hours-of-Service Compliance Lock',
      condition: 'IF shift_driving_hours >= 7.5 hrs',
      action: 'Lock New Route Assignment & Schedule 30-min Mandatory Break',
      status: true,
      lastEvaluated: '14m ago',
      evalCount: '920/day'
    }
  ] : isFintech ? [
    {
      id: 'POL-FIN-01',
      name: 'High-Velocity Card Testing Hold',
      condition: 'IF card_swipes_per_minute >= 4 AND unique_merchants >= 3',
      action: 'Temporarily Suspend Card & Trigger SMS Verification',
      status: true,
      lastEvaluated: '30s ago',
      evalCount: '58,400/day'
    },
    {
      id: 'POL-FIN-02',
      name: 'Offshore Large Wire Dual-Authorization',
      condition: 'IF transfer_amount >= $10,000 AND beneficiary_country IN high_risk',
      action: 'Hold Transaction for Compliance Officer Manual Review',
      status: true,
      lastEvaluated: '3m ago',
      evalCount: '420/day'
    }
  ] : [
    {
      id: 'POL-CLINIC-01',
      name: 'Automated Room Escalation on Triage Wait',
      condition: 'IF patient_wait_time >= 15m AND doctor_in_clinic == TRUE',
      action: 'Assign Available Exam Room & Alert Clinical Intake Nurse',
      status: true,
      lastEvaluated: '2m ago',
      evalCount: '340/day'
    },
    {
      id: 'POL-CLINIC-02',
      name: 'Critical Vital Signs Triage Override',
      condition: 'IF systolic_bp >= 160 OR heart_rate >= 115 bpm',
      action: 'Flag Patient Record as Urgent & Notify Attending Physician',
      status: true,
      lastEvaluated: '5m ago',
      evalCount: '180/day'
    },
    {
      id: 'POL-CLINIC-03',
      name: 'No-Show Early Slot Reallocation',
      condition: 'IF check_in_time > appointment_time + 15m AND patient_response == NULL',
      action: 'Release Doctor Calendar Slot to Standby Waiting List',
      status: false,
      lastEvaluated: '18m ago',
      evalCount: '64/day'
    }
  ];

  const [rules, setRules] = useState(initialRules);

  const toggleRule = (ruleId) => {
    setRules(prev =>
      prev.map(r => {
        if (r.id === ruleId) {
          const newStatus = !r.status;
          const msg = `Policy ${r.id} switched to ${newStatus ? 'ACTIVE' : 'PAUSED'}`;
          setNotice(msg);
          onTriggerAction?.(msg);
          setTimeout(() => setNotice(null), 3000);
          return { ...r, status: newStatus };
        }
        return r;
      })
    );
  };

  const handleCreateRule = (e) => {
    e?.preventDefault();
    if (!newRuleName.trim()) return;
    const created = {
      id: `POL-CUSTOM-${Date.now().toString().slice(-4)}`,
      name: newRuleName.trim(),
      condition: newCondition.trim() || 'IF condition == TRUE',
      action: newAction.trim() || 'Execute automated trigger',
      status: true,
      lastEvaluated: 'Just now',
      evalCount: '1/day'
    };
    setRules(prev => [created, ...prev]);
    setShowAddModal(false);
    setNewRuleName('');
    setNewCondition('');
    setNewAction('');
    const msg = `Created new policy rule: "${created.name}"`;
    setNotice(msg);
    onTriggerAction?.(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Action Notification */}
      {notice && (
        <div
          style={{
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            padding: '8px 14px',
            borderRadius: 'var(--theme-radius, 6px)',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
          }}
        >
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {/* Top Header & Sub-Navigation Tabs */}
      <div
        style={{
          backgroundColor: 'var(--theme-surface, #1E293B)',
          border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
          borderRadius: 'var(--theme-radius, 8px)',
          padding: isMobile ? '10px 12px' : '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 8 : 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={16} color="var(--theme-accent, #D97706)" />
          <span style={{ fontSize: isMobile ? '0.8rem' : '0.9rem', fontWeight: 800, color: 'var(--theme-text, #F8FAFC)' }}>
            System Configuration &amp; Policy Engine
          </span>
        </div>

        {/* Sub-Tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { id: 'rules', label: 'Active Rules' },
            { id: 'thresholds', label: 'Thresholds' },
            { id: 'audit', label: 'Audit Logs' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                fontSize: '0.725rem',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 'var(--theme-radius, 6px)',
                backgroundColor: activeTab === t.id ? 'var(--theme-accent, #D97706)' : 'transparent',
                color: activeTab === t.id ? '#FFFFFF' : 'var(--theme-muted, #94A3B8)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              marginLeft: isMobile ? 0 : 8,
              fontSize: '0.725rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 'var(--theme-radius, 6px)',
              backgroundColor: 'var(--theme-badge-bg, rgba(217, 119, 6, 0.15))',
              color: 'var(--theme-accent, #D97706)',
              border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Plus size={12} /> Add Rule
          </button>
        </div>
      </div>

      {/* Main Rules Engine */}
      {activeTab === 'rules' && (
        <div
          style={{
            backgroundColor: 'var(--theme-surface, #1E293B)',
            border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--theme-radius, 8px)',
            padding: isMobile ? 12 : 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
              Configured Routing Policies ({rules.length})
            </span>
            <span style={{ fontSize: '0.675rem', color: 'var(--theme-muted, #94A3B8)' }}>
              Live execution pipelines
            </span>
          </div>

          {/* Mobile Card List vs Desktop Table */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  style={{
                    backgroundColor: 'var(--theme-bg, #0F172A)',
                    border: '1px solid var(--theme-border, rgba(255,255,255,0.08))',
                    borderRadius: 'var(--theme-radius, 6px)',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.75rem', color: 'var(--theme-accent, #D97706)' }}>
                      {rule.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleRule(rule.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: rule.status ? '#10B981' : '#64748B'
                      }}
                    >
                      {rule.status ? <ToggleRight size={18} color="#10B981" /> : <ToggleLeft size={18} color="#64748B" />}
                      {rule.status ? 'ACTIVE' : 'PAUSED'}
                    </button>
                  </div>

                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
                    {rule.name}
                  </div>

                  <div style={{ fontSize: '0.7rem', color: '#93C5FD', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 4 }}>
                    <code>{rule.condition}</code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--theme-muted, #94A3B8)' }}>
                    <span>Action: <strong style={{ color: 'var(--theme-text, #F8FAFC)' }}>{rule.action}</strong></span>
                    <span>Eval: {rule.evalCount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--theme-border, rgba(255,255,255,0.1))', textAlign: 'left', color: 'var(--theme-muted, #94A3B8)' }}>
                    <th style={{ padding: '8px 10px' }}>Rule ID</th>
                    <th style={{ padding: '8px 10px' }}>Policy Name</th>
                    <th style={{ padding: '8px 10px' }}>Trigger Condition (AST)</th>
                    <th style={{ padding: '8px 10px' }}>Automated Execution</th>
                    <th style={{ padding: '8px 10px' }}>Status Toggle</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr
                      key={rule.id}
                      style={{
                        borderBottom: '1px solid var(--theme-border, rgba(255,255,255,0.05))',
                        color: 'var(--theme-text, #F8FAFC)'
                      }}
                    >
                      <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--theme-accent, #D97706)' }}>
                        {rule.id}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                        {rule.name}
                        <div style={{ fontSize: '0.675rem', color: 'var(--theme-muted, #94A3B8)' }}>
                          Last evaluated: {rule.lastEvaluated}
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontSize: '0.725rem', color: '#93C5FD' }}>
                        <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>
                          {rule.condition}
                        </code>
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '0.75rem', color: 'var(--theme-text, #F8FAFC)' }}>
                        {rule.action}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <button
                          type="button"
                          onClick={() => toggleRule(rule.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            color: rule.status ? '#10B981' : '#64748B'
                          }}
                        >
                          {rule.status ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color="#64748B" />}
                          {rule.status ? 'ACTIVE' : 'PAUSED'}
                        </button>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '0.725rem', color: 'var(--theme-muted, #94A3B8)' }}>
                        {rule.evalCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Threshold Triggers Tab */}
      {activeTab === 'thresholds' && (
        <div
          style={{
            backgroundColor: 'var(--theme-surface, #1E293B)',
            border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--theme-radius, 8px)',
            padding: 16,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 12
          }}
        >
          {[
            { title: 'SLA Grace Period Threshold', value: '15 Minutes', note: 'Escalates to supervisor on expiry' },
            { title: 'Autonomous Confidence Floor', value: '92.0%', note: 'Items below floor routed to human review' },
            { title: 'Max Concurrency Per Operator', value: '4 Cases', note: 'Prevents operator cognitive overload' }
          ].map((th, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--theme-border, rgba(255,255,255,0.06))',
                borderRadius: 'var(--theme-radius, 6px)',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--theme-muted, #94A3B8)' }}>{th.title}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--theme-text, #F8FAFC)' }}>{th.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#10B981' }}>{th.note}</div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div
          style={{
            backgroundColor: 'var(--theme-surface, #1E293B)',
            border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--theme-radius, 8px)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
            System Modification Ledger & Compliance Records
          </div>
          {[
            { actor: 'Supervisor Admin', action: 'Modified threshold for SLA Grace Period to 15m', time: '14m ago', hash: '0x8f19b2' },
            { actor: 'Compliance Officer', action: 'Activated policy POL-FIN-01 for high-velocity card testing', time: '1h ago', hash: '0x7e44a1' },
            { actor: 'System Auto-Tuner', action: 'Recalibrated rule evaluation AST for zero-copy latency', time: '4h ago', hash: '0x3c299f' }
          ].map((log, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: 4,
                fontSize: '0.75rem',
                color: 'var(--theme-text, #F8FAFC)'
              }}
            >
              <div>
                <strong>{log.actor}</strong> &bull; {log.action}
              </div>
              <div style={{ display: 'flex', gap: 10, color: 'var(--theme-muted, #94A3B8)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                <span>{log.hash}</span>
                <span>{log.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Rule Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }}
        >
          <form
            onSubmit={handleCreateRule}
            style={{
              backgroundColor: 'var(--theme-surface, #1E293B)',
              border: '1px solid var(--theme-border, rgba(255,255,255,0.15))',
              borderRadius: 'var(--theme-radius, 10px)',
              padding: 24,
              width: '100%',
              maxWidth: 480,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--theme-text, #F8FAFC)' }}>
              Create New Policy & Routing Rule
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-muted, #94A3B8)', display: 'block', marginBottom: 4 }}>
                Policy Name
              </label>
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="e.g. VIP Urgent Room Allocation"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--theme-border, rgba(255,255,255,0.15))',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  color: 'var(--theme-text, #F8FAFC)',
                  fontSize: '0.8rem'
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-muted, #94A3B8)', display: 'block', marginBottom: 4 }}>
                Trigger Condition Expression
              </label>
              <input
                type="text"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="e.g. IF patient_priority == 'HIGH' AND room_free == TRUE"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--theme-border, rgba(255,255,255,0.15))',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  color: 'var(--theme-text, #F8FAFC)',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-muted, #94A3B8)', display: 'block', marginBottom: 4 }}>
                Automated Action
              </label>
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="e.g. Assign Room 3B & Alert Dr. Vance"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--theme-border, rgba(255,255,255,0.15))',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  color: 'var(--theme-text, #F8FAFC)',
                  fontSize: '0.8rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '7px 14px',
                  fontSize: '0.775rem',
                  borderRadius: 6,
                  backgroundColor: 'transparent',
                  color: 'var(--theme-muted, #94A3B8)',
                  border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '7px 14px',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  borderRadius: 6,
                  backgroundColor: 'var(--theme-accent, #D97706)',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Save & Deploy Policy
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
