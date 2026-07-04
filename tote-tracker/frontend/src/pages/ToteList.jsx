import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ToteIcon from '../components/ToteIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ALL_TAGS = ['Garage', 'Kitchen', 'Bedroom', 'Office', 'Holiday', 'Tools', 'Clothes', 'Sports', 'Electronics', 'Other'];

export default function ToteList({ theme, onToggleTheme }) {
  const { user, logout, apiFetch } = useAuth();
  const [totes, setTotes] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ label: '', location: '', tags: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const canEdit = user?.role === 'editor' || user?.role === 'admin';

  useEffect(() => { fetchTotes(); }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      const res = await apiFetch(`/api/totes/search?q=${encodeURIComponent(search)}`);
      setSearchResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function fetchTotes() {
    const res = await apiFetch('/api/totes');
    if (res.ok) setTotes(await res.json());
  }

  async function createTote(e) {
    e.preventDefault();
    if (!form.label.trim()) return;
    setLoading(true);
    await apiFetch('/api/totes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ label: '', location: '', tags: [] });
    setShowModal(false);
    setLoading(false);
    fetchTotes();
  }

  function toggleTag(tag) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  }

  const totalItems = totes.reduce((a, t) => a + (t.item_count || 0), 0);

  const visibleTotes = totes.filter(t => {
    if (activeTag && !t.tags?.includes(activeTag)) return false;
    return true;
  });

  const allUsedTags = [...new Set(totes.flatMap(t => t.tags || []))];

  return (
    <div className="page">
      <div className="app-header mobile-only">
        <div className="app-logo">
          <div className="logo-icon"><ToteIcon size={24} /></div>
          <div>
            <div className="app-title">Tote Tracker</div>
            <div className="app-subtitle">Inventory Management</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="theme-toggle" onClick={onToggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New Tote</button>
          )}
        </div>
      </div>

      {/* Desktop page title row */}
      {canEdit && (
        <div className="desktop-only" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}>My Totes</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New Tote</button>
        </div>
      )}

      {/* User bar */}
      <div className="user-bar mobile-only">
        <div className="user-bar-info">
          <div className="user-avatar-sm">{user?.name?.[0]?.toUpperCase()}</div>
          <span className="user-bar-name">{user?.name}</span>
          <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {user?.role === 'admin' && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>⚙ Users</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign Out</button>
        </div>
      </div>

      {totes.length > 0 && (
        <div className="status-bar">
          <div className="status-dot" />
          <div className="status-item">Totes: <span className="status-val">{totes.length}</span></div>
          <div className="status-item">Items: <span className="status-val">{totalItems}</span></div>
          <a href="/api/totes/export" className="status-export">↓ Export CSV</a>
        </div>
      )}

      {/* Search */}
      <div className="search-wrap">
        <span className="search-icon">⌕</span>
        <input
          className="search-input"
          placeholder="Search items across all totes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Search results */}
      {searchResults !== null && (
        <div className="search-results">
          <div className="search-results-header">
            {searchResults.length === 0
              ? `No results for "${search}"`
              : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${search}"`}
          </div>
          {searchResults.map(item => (
            <div key={item.id} className="search-result-row" onClick={() => navigate(`/tote/${item.tote_id}`)}>
              <div className="search-result-item">{item.name}</div>
              <div className="search-result-tote">in {item.tote_label}</div>
              {item.tote_location && <div className="search-result-loc">📍 {item.tote_location}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Tag filter */}
      {allUsedTags.length > 0 && !searchResults && (
        <div className="tag-filter">
          <button className={`tag-chip ${!activeTag ? 'active' : ''}`} onClick={() => setActiveTag(null)}>All</button>
          {allUsedTags.map(tag => (
            <button
              key={tag}
              className={`tag-chip ${activeTag === tag ? 'active' : ''}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >{tag}</button>
          ))}
        </div>
      )}

      {!searchResults && (
        visibleTotes.length === 0 ? (
          <div className="empty">
            <span className="empty-icon"><ToteIcon size={52} /></span>
            <div className="empty-title">{activeTag ? `No ${activeTag} totes` : 'No totes yet'}</div>
            <div className="empty-sub">
              {canEdit
                ? 'Create your first tote and use AI\nto automatically catalog its contents'
                : 'No totes have been created yet.'}
            </div>
            {!activeTag && canEdit && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create First Tote</button>
            )}
          </div>
        ) : (
          <div className="tote-grid">
            {visibleTotes.map(t => (
              <div key={t.id} className="tote-card" onClick={() => navigate(`/tote/${t.id}`)}>
                <div className="tote-card-inner">
                  <div className="tote-card-icon"><ToteIcon size={22} /></div>
                  <div className="tote-card-content">
                    <div className="tote-card-label">{t.label}</div>
                    <div className="tote-card-loc">{t.location ? `📍 ${t.location}` : 'No location set'}</div>
                    {t.tags?.length > 0 && (
                      <div className="tote-tags">
                        {t.tags.map(tag => <span key={tag} className="tote-tag">{tag}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="tote-card-right">
                    <div className="item-count">{t.item_count}</div>
                    <div className="item-count-label">items</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showModal && canEdit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-title">New Tote</div>
            <form onSubmit={createTote}>
              <div className="field">
                <label>Tote Label *</label>
                <input className="input input-full" placeholder="e.g. Kitchen Supplies"
                  value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} autoFocus />
              </div>
              <div className="field">
                <label>Storage Location</label>
                <input className="input input-full" placeholder="e.g. Garage Shelf 3"
                  value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="field">
                <label>Categories</label>
                <div className="tag-picker">
                  {ALL_TAGS.map(tag => (
                    <button key={tag} type="button"
                      className={`tag-chip ${form.tags.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >{tag}</button>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating…' : 'Create Tote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
