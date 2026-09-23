import React, { useState } from 'react';
import {
  Search,
  Filter,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bot,
  Send,
  Calendar,
  Sparkles,
  ChevronRight,
  Shield,
  FileText,
  Building,
  ArrowRight,
  Truck,
  Zap
} from 'lucide-react';

export const WorkspaceQueueScreenView = ({
  screen,
  allScreens,
  domain,
  deviceView,
  isPrototype = false,
  onScreenChange,
  onTriggerAction
}) => {
  const isMobile = deviceView === 'mobile';
  const isTablet = deviceView === 'tablet';

  const isCyber = /cyber|soc|threat|incident/i.test(domain + ' ' + screen.name);
  const isLogistics = /logistics|supply|fleet|dispatch|vehicle|driver/i.test(domain + ' ' + screen.name);
  const isFood = /food|delivery|kitchen/i.test(domain + ' ' + screen.name);
  const isFintech = /fraud|fintech|bank|transaction/i.test(domain + ' ' + screen.name);

  // Domain-specific queue dataset
  const queueItems = isCyber ? [
    {
      id: 'SEC-4091',
      title: 'Ransomware C2 Beaconing Detected',
      entity: 'Host: WS-FINANCE-04 (192.168.4.12)',
      status: 'CRITICAL',
      time: '2m wait',
      assigned: 'SOC Tier 2',
      details: 'Automated EDR sensor intercepted periodic outbound DNS beacons to suspicious TLD .xyz. Process: powershell.exe spawned from Excel macro.',
      timeline: ['11:02:14 - EDR beacon detected', '11:03:00 - Isolated network adapter', '11:03:45 - Host memory dump scheduled'],
      actions: ['Quarantine Host', 'Revoke Kerberos Token', 'Detonate in Sandbox']
    },
    {
      id: 'SEC-4092',
      title: 'Brute-Force SSH Authentication Spike',
      entity: 'Gateway: FW-EDGE-01 (10.0.0.1)',
      status: 'HIGH',
      time: '8m wait',
      assigned: 'Firewall Ops',
      details: 'Over 4,200 failed auth attempts from Tor exit relays within 60 seconds targeting root credentials.',
      timeline: ['10:55:00 - Rate-limit triggered', '10:57:12 - Geo-block rule evaluated'],
      actions: ['Block IP Subnet', 'Update ACL Rule', 'Notify Security Lead']
    },
    {
      id: 'SEC-4093',
      title: 'Privilege Escalation via CVE-2024-3801',
      entity: 'Server: DB-CLUSTER-PROD',
      status: 'INVESTIGATING',
      time: '18m wait',
      assigned: 'Analyst J. Cole',
      details: 'Unprivileged service account acquired SYSTEM privileges through kernel race condition vulnerability.',
      timeline: ['10:40:20 - Privilege elevation event logged'],
      actions: ['Kill Process Tree', 'Roll Back Patch', 'Export Audit PCAP']
    }
  ] : isLogistics ? [
    {
      id: 'DSP-501',
      title: 'Route Zone 4A: Metro Parcel Batch',
      entity: 'Van #12 (Driver: Carlos R.)',
      status: 'URGENT',
      time: '4m wait',
      assigned: 'Carlos R.',
      details: 'Heavy traffic on Interstate 95 delay warning. 42 express parcels with guaranteed 12:00 PM SLA window.',
      timeline: ['08:30 AM - Loaded at North Hub', '09:45 AM - Delay warning flagged (Traffic +22m)'],
      actions: ['Re-route via Highway 7', 'Reassign 12 Stops to Van 18', 'Send Recipient ETA Updates']
    },
    {
      id: 'DSP-502',
      title: 'Route Zone 2B: Refrigerated Medical Supplies',
      entity: 'Truck #08 (Driver: Elena V.)',
      status: 'IN_TRANSIT',
      time: '12m wait',
      assigned: 'Elena V.',
      details: 'Temperature-controlled cargo telemetry at 3.8°C (Threshold: 2.0°C - 6.0°C). 8 hospital delivery stops remaining.',
      timeline: ['07:00 AM - Temperature logger verified', '09:15 AM - Stop 1 & 2 delivered on-time'],
      actions: ['Confirm Temperature Log', 'Optimize Next Waypoint', 'Notify Receiving Clinic']
    },
    {
      id: 'DSP-503',
      title: 'Route Zone 7C: Urgent On-Demand Delivery',
      entity: 'Van #03 (Driver: Mike T.)',
      status: 'SCHEDULED',
      time: '24m wait',
      assigned: 'Mike T.',
      details: 'B2B high-priority manufacturing component delivery required before shift change at 2:00 PM.',
      timeline: ['10:00 AM - Dispatch order received from ERP'],
      actions: ['Assign Van #03', 'Print Bill of Lading', 'Broadcast Dispatch Ping']
    }
  ] : isFintech ? [
    {
      id: 'TXN-8821',
      title: 'International Wire Transfer ($14,500)',
      entity: 'Account: #99014 (Acme Global Ltd)',
      status: 'HIGH_RISK',
      time: '1m wait',
      assigned: 'Risk Desk Alpha',
      details: 'Wire requested to newly added offshore beneficiary in high-risk jurisdiction. Behavioral typing cadence deviated 88% from normal account operator.',
      timeline: ['11:15:02 - Wire submitted via API', '11:15:04 - Risk score 94/100 computed'],
      actions: ['Hold Transaction', 'Trigger Biometric 2FA', 'Whistelist Beneficiary']
    },
    {
      id: 'TXN-8822',
      title: 'Crypto Exchange Merchant Payout',
      entity: 'Account: #33120 (Satoshi Pay)',
      status: 'FLAGGED',
      time: '9m wait',
      assigned: 'AML Officer S. Miller',
      details: 'Series of 12 rapid micro-transactions totaling $9,800 just under SAR reporting threshold.',
      timeline: ['10:50:00 - Structuring pattern identified'],
      actions: ['File Regulatory SAR', 'Freeze Withdrawal', 'Request KYC Docs']
    }
  ] : [
    {
      id: 'PT-1049',
      title: 'Elena Rostova (MRN #88204)',
      entity: 'Cardiology Follow-Up & ECG Review',
      status: 'CHECKED_IN',
      time: '3m wait',
      assigned: 'Dr. Marcus Vance (Room 3B)',
      details: 'Patient arrived for post-op heart valve checkup. Vitals captured at triage: BP 124/82, HR 74, SpO2 99%. Patient reported mild shortness of breath on exertion.',
      timeline: ['10:45 AM - Mobile check-in confirmed', '10:50 AM - Vitals taken by Nurse Station 2', '10:55 AM - Pre-consult lab results attached'],
      actions: ['Assign to Room 3B', 'Notify Dr. Vance', 'Order Resting ECG']
    },
    {
      id: 'PT-1050',
      title: 'Julian Chen (MRN #77192)',
      entity: 'Annual Comprehensive Wellness Exam',
      status: 'IN_CONSULT',
      time: '14m in consult',
      assigned: 'Dr. Sarah Jenkins (Room 1A)',
      details: 'Routine preventative health examination and lipid panel review. No acute symptoms reported. Immunization booster requested.',
      timeline: ['10:15 AM - Checked in at reception', '10:30 AM - Exam room 1A entered'],
      actions: ['Print Lab Requisition', 'Schedule 6-Month Followup', 'Complete Encounter']
    },
    {
      id: 'PT-1051',
      title: 'Amina Al-Mansoor (MRN #90412)',
      entity: 'Orthopedic Knee Joint Assessment',
      status: 'WAITING',
      time: '18m wait',
      assigned: 'Dr. Robert Hayes (Room 4C)',
      details: 'Referred by physical therapy for evaluation of persistent right meniscus discomfort following sports injury. MRI imaging disc received and uploaded.',
      timeline: ['10:35 AM - Checked in at desk', '10:42 AM - MRI files ingested into PACS'],
      actions: ['Transfer to Exam Room 4C', 'Review MRI Scans', 'Send SMS Delay Alert']
    },
    {
      id: 'PT-1052',
      title: 'Thomas Wright (MRN #63920)',
      entity: 'Endocrinology Diabetic Follow-Up',
      status: 'CONFIRMED',
      time: 'Starts in 25m',
      assigned: 'Dr. Marcus Vance (Room 3B)',
      details: 'Continuous glucose monitor (CGM) 90-day telemetry download ready for physician interpretation. Fasting A1C steady at 6.8%.',
      timeline: ['09:00 AM - Telemetry uploaded via patient portal'],
      actions: ['Pre-Authorize Prescription', 'Check-In Patient Early', 'Reschedule Slot']
    }
  ];

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [actionNotice, setActionNotice] = useState(null);
  const [mobileTab, setMobileTab] = useState('queue'); // 'queue' | 'detail' | 'copilot'

  const selectedItem = queueItems[selectedIdx] || queueItems[0];

  const filteredItems = queueItems.filter(item => {
    const matchesSearch = (item.title + ' ' + item.id + ' ' + item.entity).toLowerCase().includes(filterQuery.toLowerCase());
    if (activeFilter === 'All') return matchesSearch;
    if (activeFilter === 'High Priority' || activeFilter === 'Urgent') return matchesSearch && (item.status === 'CRITICAL' || item.status === 'URGENT' || item.status === 'HIGH' || item.status === 'CHECKED_IN');
    return matchesSearch;
  });

  const handleAction = (label) => {
    setActionNotice(`Executed action: "${label}" on ${selectedItem.id}`);
    onTriggerAction?.(`Action "${label}" executed for ${selectedItem.id}`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14 }}>
      {/* Action Notification Banner */}
      {actionNotice && (
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
          <CheckCircle2 size={16} /> {actionNotice}
        </div>
      )}

      {/* MOBILE ONLY: Master-Detail Segmented Switcher */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--theme-surface, #1E293B)',
            padding: 3,
            borderRadius: 8,
            border: '1px solid var(--theme-border, rgba(255,255,255,0.08))',
            gap: 3
          }}
        >
          <button
            type="button"
            onClick={() => setMobileTab('queue')}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: '0.725rem',
              fontWeight: mobileTab === 'queue' ? 800 : 500,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: mobileTab === 'queue' ? 'var(--theme-accent, #D97706)' : 'transparent',
              color: mobileTab === 'queue' ? '#FFFFFF' : 'var(--theme-muted, #94A3B8)',
              transition: 'all 0.2s ease'
            }}
          >
            Queue ({filteredItems.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('detail')}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: '0.725rem',
              fontWeight: mobileTab === 'detail' ? 800 : 500,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: mobileTab === 'detail' ? 'var(--theme-accent, #D97706)' : 'transparent',
              color: mobileTab === 'detail' ? '#FFFFFF' : 'var(--theme-muted, #94A3B8)',
              transition: 'all 0.2s ease'
            }}
          >
            Details ({selectedItem.id})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('copilot')}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: '0.725rem',
              fontWeight: mobileTab === 'copilot' ? 800 : 500,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: mobileTab === 'copilot' ? 'var(--theme-accent, #D97706)' : 'transparent',
              color: mobileTab === 'copilot' ? '#FFFFFF' : 'var(--theme-muted, #94A3B8)',
              transition: 'all 0.2s ease'
            }}
          >
            AI Copilot
          </button>
        </div>
      )}

      {/* Split-View Layout Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1.6fr 1.1fr',
          gap: isMobile ? 10 : 14,
          minHeight: isMobile ? 'auto' : 520
        }}
      >
        {/* PANE 1 (LEFT): Filterable Queue List */}
        {/* PANE 1 (LEFT): Filterable Queue List */}
        <div
          style={{
            display: isMobile && mobileTab !== 'queue' ? 'none' : 'flex',
            backgroundColor: 'var(--theme-surface, #1E293B)',
            border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--theme-radius, 8px)',
            padding: 14,
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
              Active Queue ({filteredItems.length})
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: 'var(--theme-badge-bg, rgba(217, 119, 6, 0.15))',
                color: 'var(--theme-accent, #D97706)'
              }}
            >
              TRIAGE STREAM
            </span>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--theme-muted, #94A3B8)' }} />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by ID, name or details..."
              style={{
                width: '100%',
                padding: '7px 10px 7px 28px',
                fontSize: '0.75rem',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                borderRadius: 'var(--theme-radius, 6px)',
                color: 'var(--theme-text, #F8FAFC)',
                outline: 'none'
              }}
            />
          </div>

          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['All', 'High Priority'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setActiveFilter(chip)}
                style={{
                  fontSize: '0.7rem',
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                  backgroundColor: activeFilter === chip ? 'var(--theme-accent, #D97706)' : 'transparent',
                  color: activeFilter === chip ? '#FFFFFF' : 'var(--theme-muted, #94A3B8)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Queue Item Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: isMobile ? 'none' : 420 }}>
            {filteredItems.map((item) => {
              const isSelected = item.id === selectedItem.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedIdx(queueItems.findIndex(q => q.id === item.id));
                    if (isMobile) setMobileTab('detail');
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--theme-radius, 6px)',
                    backgroundColor: isSelected ? 'var(--theme-badge-bg, rgba(217,119,6,0.15))' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSelected ? 'var(--theme-accent, #D97706)' : 'var(--theme-border, rgba(255,255,255,0.06))'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--theme-accent, #D97706)' }}>
                      {item.id}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 3,
                        backgroundColor: item.status === 'CRITICAL' || item.status === 'URGENT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: item.status === 'CRITICAL' || item.status === 'URGENT' ? '#EF4444' : '#F59E0B'
                      }}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
                    {item.title}
                  </div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--theme-muted, #94A3B8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span><Clock size={11} style={{ verticalAlign: 'middle' }} /> {item.time} &bull; {item.assigned}</span>
                    {isMobile && <span style={{ color: 'var(--theme-accent, #D97706)', fontWeight: 700 }}>View →</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANE 2 (CENTER): Selected Case Detail Inspector */}
        <div
          style={{
            display: isMobile && mobileTab !== 'detail' ? 'none' : 'flex',
            backgroundColor: 'var(--theme-surface, #1E293B)',
            border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--theme-radius, 8px)',
            padding: 16,
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 14
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* MOBILE ONLY: Back to Queue button */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileTab('queue')}
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  color: 'var(--theme-accent, #D97706)',
                  backgroundColor: 'var(--theme-badge-bg, rgba(217,119,6,0.15))',
                  border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                ← Back to Queue List
              </button>
            )}

            {/* Header / ID / Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.9rem', color: 'var(--theme-accent, #D97706)' }}>
                    {selectedItem.id}
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: 'var(--theme-badge-bg, rgba(217, 119, 6, 0.15))',
                      color: 'var(--theme-accent, #D97706)'
                    }}
                  >
                    {selectedItem.status}
                  </span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--theme-text, #F8FAFC)', marginTop: 2 }}>
                  {selectedItem.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--theme-muted, #94A3B8)' }}>
                  {selectedItem.entity}
                </div>
              </div>

              <div style={{ fontSize: '0.725rem', color: 'var(--theme-muted, #94A3B8)', textAlign: 'right' }}>
                Assigned: <strong style={{ color: 'var(--theme-text, #F8FAFC)' }}>{selectedItem.assigned}</strong>
              </div>
            </div>

            {/* Case Details Summary Box */}
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.15)',
                border: '1px solid var(--theme-border, rgba(255,255,255,0.06))',
                borderRadius: 'var(--theme-radius, 6px)',
                padding: 12,
                fontSize: '0.8rem',
                color: 'var(--theme-text, #F8FAFC)',
                lineHeight: 1.45
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--theme-muted, #94A3B8)', textTransform: 'uppercase', marginBottom: 4 }}>
                Encounter Assessment & Telemetry
              </div>
              {selectedItem.details}
            </div>

            {/* Timeline Events */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--theme-muted, #94A3B8)', textTransform: 'uppercase' }}>
                Operational Audit History
              </div>
              {selectedItem.timeline.map((event, eIdx) => (
                <div
                  key={eIdx}
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--theme-text, #F8FAFC)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderRadius: 4
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--theme-accent, #D97706)' }} />
                  {event}
                </div>
              ))}
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid var(--theme-border, rgba(255,255,255,0.08))' }}>
            {selectedItem.actions.map((act, aIdx) => (
              <button
                key={aIdx}
                type="button"
                onClick={() => handleAction(act)}
                style={{
                  padding: '7px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: 'var(--theme-radius, 6px)',
                  backgroundColor: aIdx === 0 ? 'var(--theme-accent, #D97706)' : 'var(--theme-badge-bg, rgba(217,119,6,0.15))',
                  color: aIdx === 0 ? '#FFFFFF' : 'var(--theme-accent, #D97706)',
                  border: aIdx === 0 ? 'none' : '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                {aIdx === 0 ? <CheckCircle2 size={13} /> : <Zap size={13} />}
                {act}
              </button>
            ))}
          </div>
        </div>

        {/* PANE 3 (RIGHT): AI Triage & Copilot Assistant */}
        <div
          style={{
            display: isMobile && mobileTab !== 'copilot' ? 'none' : 'flex',
            backgroundColor: 'var(--theme-surface, #1E293B)',
            border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--theme-radius, 8px)',
            padding: 14,
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--theme-border, rgba(255,255,255,0.08))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bot size={16} color="var(--theme-accent, #D97706)" />
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
                  AI Triage Copilot
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981'
                }}
              >
                98.4% CONFIDENCE
              </span>
            </div>

            {/* AI Recommendation Card */}
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--theme-border, rgba(255,255,255,0.08))',
                borderRadius: 'var(--theme-radius, 6px)',
                padding: 12,
                fontSize: '0.775rem',
                color: 'var(--theme-text, #F8FAFC)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--theme-accent, #D97706)', fontWeight: 700, fontSize: '0.725rem' }}>
                <Sparkles size={12} /> Autonomous Recommendation
              </div>
              <p style={{ margin: 0, lineHeight: 1.45, color: 'var(--theme-text, #F8FAFC)' }}>
                Based on historic SLAs and current shift utilization, prioritize immediate execution of{' '}
                <strong>{selectedItem.actions[0]}</strong>. Projected turnaround savings: 11.4 mins.
              </p>
              <button
                type="button"
                onClick={() => handleAction(selectedItem.actions[0])}
                style={{
                  marginTop: 6,
                  padding: '6px 10px',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  borderRadius: 4,
                  backgroundColor: 'var(--theme-accent, #D97706)',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5
                }}
              >
                <CheckCircle2 size={12} /> Apply AI Recommendation
              </button>
            </div>

            {/* AI Context Specs */}
            <div style={{ fontSize: '0.725rem', color: 'var(--theme-muted, #94A3B8)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>&bull; Model: <strong>RootForge Triage Core v3.2</strong></div>
              <div>&bull; Context window: <strong>Encounter historical ledger</strong></div>
              <div>&bull; Compliance status: <strong>Audited & Encrypted</strong></div>
            </div>
          </div>

          <div
            style={{
              padding: 10,
              backgroundColor: 'rgba(0,0,0,0.15)',
              borderRadius: 'var(--theme-radius, 6px)',
              border: '1px solid var(--theme-border, rgba(255,255,255,0.05))',
              fontSize: '0.7rem',
              color: 'var(--theme-muted, #94A3B8)'
            }}
          >
            Tip: Use keyboard shortcut <strong>[Space]</strong> to confirm triage or <strong>[J/K]</strong> to cycle active queue items.
          </div>
        </div>
      </div>
    </div>
  );
};
