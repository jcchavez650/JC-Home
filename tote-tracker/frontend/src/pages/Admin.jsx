import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = ['viewer', 'editor', 'admin'];

const ROLE_INFO = {
  admin:  { label: 'Admin',  color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  editor: { label: 'Editor', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  viewer: { label: 'Viewer', color: '#9ca3b0', bg: 'rgba(156,163,176,0.1)' },
};

const BLANK_USER = { email: '', name: '', password: '', role: 'viewer' };

export default function Admin({ theme, onToggleTheme }) {
  const { user, apiFetch } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState(BLANK_USER);
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showEditPass, setShowEditPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    fetchUsers();
    fetchSettings();
  }, [user]);

  async function fetchUsers() {
    const res = await apiFetch('/api/users');
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  async function fetchSettings() {
    const res = await apiFetch('/api/users/settings');
    if (res.ok) {
      const data = await res.json();
      setRegistrationOpen(data.open_registration === 'true');
    }
  }

  async function toggleRegistration() {
    setSettingsLoading(true);
    const res = await apiFetch('/api/users/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ open_registration: !registrationOpen }),
    });
    if (res.ok) {
      const data = await res.json();
      setRegistrationOpen(data.open_registration === 'true');
    }
    setSettingsLoading(false);
  }

  function startEdit(u) {
    setEditingId(u.id);
    setEditForm({ name: u.name, role: u.role, password: '' });
    setEditError('');
    setShowEditPass(false);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    const body = { name: editForm.name, role: editForm.role };
    if (editForm.password) body.password = editForm.password;
    const res = await apiFetch(`/api/users/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setEditError(data.error); setEditLoading(false); return; }
    setUsers(u => u.map(x => x.id === editingId ? data : x));
    setEditingId(null);
    setEditLoading(false);
  }

  async function deleteUser(id) {
    if (!confirm('Remove this user? They will lose access immediately.')) return;
    setError('');
    const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setUsers(u => u.filter(x => x.id !== id));
  }

  async function addUser(e) {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    const res = await apiFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error); setAddLoading(false); return; }
    setUsers(u => [...u, data]);
    setNewUser(BLANK_USER);
    setShowAddUser(false);
    setAddLoading(false);
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

      {/* Registration toggle */}
      <div className="section" style={{ marginBottom: 16 }}>
        <div className="section-label">Registration</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Open Registration</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              {registrationOpen ? 'Anyone can create an account' : 'Only admins can add new users'}
            </div>
          </div>
          <button
            className={`btn btn-sm ${registrationOpen ? 'btn-danger' : 'btn-primary'}`}
            onClick={toggleRegistration}
            disabled={settingsLoading}
            style={{ minWidth: 72 }}
          >
            {settingsLoading ? '…' : registrationOpen ? 'Close' : 'Open'}
          </button>
        </div>
      </div>

      {/* Role legend */}
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

      {/* User list */}
      <div className="section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>{users.length} {users.length === 1 ? 'User' : 'Users'}</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowAddUser(v => !v); setAddError(''); setEditingId(null); }}>
            {showAddUser ? 'Cancel' : '+ Add User'}
          </button>
        </div>

        {/* Add user form */}
        {showAddUser && (
          <form onSubmit={addUser} style={{ padding: '14px 0 10px', borderBottom: '1px solid var(--border)' }}>
            {addError && <div className="auth-error" style={{ marginBottom: 10 }}>{addError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Full Name</label>
                  <input className="input input-full" placeholder="Jane Smith" value={newUser.name}
                    onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} required />
                </div>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Email</label>
                  <input className="input input-full" type="email" placeholder="jane@example.com" value={newUser.email}
                    onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input input-full" type={showNewPass ? 'text' : 'password'}
                      placeholder="Min. 6 characters" value={newUser.password}
                      onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                      style={{ paddingRight: 36 }} required />
                    <button type="button" onClick={() => setShowNewPass(v => !v)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-3)', padding: 0 }}>
                      {showNewPass ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <div className="field" style={{ minWidth: 110, marginBottom: 0 }}>
                  <label>Role</label>
                  <select className="input input-full role-select" value={newUser.role}
                    onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addLoading} style={{ alignSelf: 'flex-end' }}>
                {addLoading ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {users.map((u, i) => {
              const isSelf = u.id === user.id;
              const isEditing = editingId === u.id;
              return (
                <div key={u.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  {isEditing ? (
                    /* Inline edit form */
                    <form onSubmit={saveEdit} style={{ padding: '14px 0' }}>
                      {editError && <div className="auth-error" style={{ marginBottom: 10 }}>{editError}</div>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                            <label>Full Name</label>
                            <input className="input input-full" value={editForm.name}
                              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
                          </div>
                          <div className="field" style={{ minWidth: 110, marginBottom: 0 }}>
                            <label>Role</label>
                            <select className="input input-full role-select" value={editForm.role}
                              onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                              disabled={isSelf}>
                              {ROLES.map(r => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>New Password <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(leave blank to keep current)</span></label>
                          <div style={{ position: 'relative' }}>
                            <input className="input input-full" type={showEditPass ? 'text' : 'password'}
                              placeholder="Enter new password…" value={editForm.password}
                              onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                              style={{ paddingRight: 36 }} />
                            <button type="button" onClick={() => setShowEditPass(v => !v)}
                              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-3)', padding: 0 }}>
                              {showEditPass ? '🙈' : '👁'}
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                          <button type="submit" className="btn btn-primary btn-sm" disabled={editLoading}>
                            {editLoading ? 'Saving…' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    /* User row */
                    <div className="user-row">
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
                        <span className="role-badge" style={{ background: ROLE_INFO[u.role]?.bg, color: ROLE_INFO[u.role]?.color }}>
                          {ROLE_INFO[u.role]?.label || u.role}
                        </span>
                        <button className="edit-item-btn" onClick={() => { startEdit(u); setShowAddUser(false); }} title="Edit user">✎</button>
                        {!isSelf && (
                          <button className="delete-btn" onClick={() => deleteUser(u.id)} title="Remove user">✕</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
