import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import {
  Shield,
  Users,
  Activity,
  Server,
  Building2,
  FolderKanban,
  FileText,
  Cpu,
  Plus,
  X,
  CheckCircle2
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const { t, lang } = useLanguage();
  const [metrics, setMetrics] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create User Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CONSULTANT',
    organizationName: 'Acme Retail Global'
  });

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [metricRes, userRes] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminUsers()
      ]);
      setMetrics(metricRes.metrics);
      setSystemHealth(metricRes.systemHealth);
      setUsers(userRes.users || []);
    } catch (err) {
      console.error('Failed to load admin console:', err);
      showToast('Admin access required', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      showToast('User role updated.');
    } catch (err) {
      showToast('Failed to change user role', 'error');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createAdminUser(newUser);
      setUsers([res.user, ...users]);
      setModalOpen(false);
      showToast(`User ${res.user.name} created successfully.`);
    } catch (err) {
      showToast(err.message || 'Failed to create user', 'error');
    }
  };

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--text-muted)' }}>{t.common.loading}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={24} color="var(--accent-amber)" />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{t.admin.title}</h1>
            <span className="badge badge-amber">{lang === 'hi' ? 'रूट विशेषाधिकार' : lang === 'gu' ? 'રૂટ વિશેષાધિકારો' : 'ROOT PRIVILEGES'}</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {lang === 'hi' ? 'सिस्टम स्वास्थ्य, परिचालन टेलीमेट्री, संगठन और भूमिका अनुमतियां' : lang === 'gu' ? 'સિસ્ટમ સ્થિતિ, ઓપરેશનલ ટેલિમેટ્રી, સંસ્થાઓ અને ભૂમિકા પરવાનગીઓ' : 'System health, operational telemetry, multi-tenant organizations, and role permissions'}
          </p>
        </div>

        <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm">
          <Plus size={14} /> {t.admin.provisionUser}
        </button>
      </div>

      {/* System Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 16 }}>
        {[
          { label: 'Active Users', val: metrics?.userCount || 0, icon: Users },
          { label: 'Organizations', val: metrics?.orgCount || 0, icon: Building2 },
          { label: 'Transformation Workspaces', val: metrics?.workspaceCount || 0, icon: FolderKanban },
          { label: 'Ingested Documents', val: metrics?.docCount || 0, icon: FileText },
          { label: 'Generated Solutions', val: metrics?.solutionCount || 0, icon: Cpu },
          { label: 'Audit Log Entries', val: metrics?.activityCount || 0, icon: Activity }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</span>
                <Icon size={16} color="var(--accent-amber)" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 6 }}>
                {item.val}
              </div>
            </div>
          );
        })}
      </div>

      {/* System Health Status */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={18} color="var(--accent-green)" />
          Platform Health & Telemetry
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14 }}>
          <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>DATABASE STATUS</div>
            <div style={{ fontWeight: 800, color: 'var(--accent-green-text)', marginTop: 2 }}>
              CONNECTED (SQLite / PostgreSQL Fallback)
            </div>
          </div>

          <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE AI ENGINE</div>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {systemHealth?.aiProvider || 'Deterministic Demo Engine'}
            </div>
          </div>

          <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>PROCESS MEMORY HEAP</div>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {systemHealth?.memoryUsageMB || '28.4'} MB
            </div>
          </div>

          <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>SYSTEM UPTIME</div>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {systemHealth?.uptimeHours || '0.1'} Hours
            </div>
          </div>
        </div>
      </div>

      {/* User Governance Table */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>
          User Directory & Privilege Management
        </h3>

        <div className="table-responsive">
          <table className="enterprise-table" style={{ minWidth: 620 }}>
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email Address</th>
                <th>Organization</th>
                <th>Assigned Role</th>
                <th style={{ width: 160 }}>Modify Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>{u.organization}</td>
                  <td>
                    <span
                      className={
                        u.role === 'ADMIN' ? 'badge badge-red' :
                        u.role === 'CONSULTANT' ? 'badge badge-amber' :
                        u.role === 'ANALYST' ? 'badge badge-blue' : 'badge badge-gray'
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="CONSULTANT">CONSULTANT</option>
                      <option value="ANALYST">ANALYST</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision User Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontWeight: 800 }}>Provision Enterprise User</h4>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateUser} style={{ padding: 20 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Sterling"
                  className="form-input"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="rachel@acmeretail.com"
                  className="form-input"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div className="grid-responsive-2col" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="CONSULTANT">CONSULTANT</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    className="form-input"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
