import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = ['viewer', 'editor', 'admin'];

const ROLE_INFO = {
  admin:  { label: 'Admin',  color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  editor: { label: 'Editor', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  viewer: { label: 'Viewer', color: '#9ca3b0', bg: 'rgba(156,163,176,0.1)' },
};

export default function Admin({ theme, onToggleTheme }) {
  const { user, apiFetch } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    fetchUsers();
  }, [user]);

  async function fetchUsers() {
    const res = await apiFetch('/api/users');
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  async function updateRole(id, role) {
    setError('');
    const res = await apiFetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setUsers(u => u.map(x => x.id === id ? data : x));
  }

  async function deleteUser(id) {
    if (!confirm('Remove this user? They will lose access immediately.')) return;
    setError('');
    const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setUsers(u => u.filter(x => x.id !== id));
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="back-nav" style={{ marginBottom: 0 }} onClick={() => navigate('/')}>← Back</div>
        <button className="theme-toggle" onClick={onToggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}>User Management</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Manage who can access Tote Tracker and what they can do.
        </p>
      </div>

      <div className="section" style={{ marginBottom: 16 }}>
        <div className="section-label">Roles</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(ROLE_INFO).map(([key, info]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span className="role-badge" style={{ background: info.bg, color: info.color, marginTop: 1 }}>
                {info.label}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {key === 'admin' && 'Full access — manage users, create/edit/delete totes'}
                {key === 'editor' && 'Create, edit, and delete totes and items'}
                {key === 'viewer' && 'View totes and items only — cannot make changes'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="section">
        <div className="section-label">{users.length} {users.length === 1 ? 'User' : 'Users'}</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {users.map((u, i) => {
              const info = ROLE_INFO[u.role] || ROLE_INFO.viewer;
              const isSelf = u.id === user.id;
              return (
                <div key={u.id} className="user-row" style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div className="user-avatar">
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {u.name}
                      {isSelf && <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <select
                      className="role-select"
                      value={u.role}
                      onChange={e => updateRole(u.id, e.target.value)}
                      disabled={isSelf}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_INFO[r].label}</option>
                      ))}
                    </select>
                    {!isSelf && (
                      <button className="delete-btn" onClick={() => deleteUser(u.id)} title="Remove user">✕</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
