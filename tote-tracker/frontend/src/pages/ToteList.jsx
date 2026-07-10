import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ToteIcon from '../components/ToteIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import LangToggle from '../components/LangToggle.jsx';

const ALL_TAGS = ['Garage', 'Kitchen', 'Bedroom', 'Office', 'Holiday', 'Tools', 'Clothes', 'Sports', 'Electronics', 'Other'];

export default function ToteList({ theme, onToggleTheme }) {
  const { user, logout, apiFetch } = useAuth();
  const { t } = useLang();
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
    const timer = setTimeout(async () => {
      const res = await apiFetch(`/api/totes/search?q=${encodeURIComponent(search)}`);
      setSearchResults(await res.json());
    }, 300);
    return () => clearTimeout(timer);
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
            <div className="app-subtitle">{t('app.subtitle')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="theme-toggle" onClick={onToggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <LangToggle />
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>{t('list.newTote')}</button>
          )}
        </div>
      </div>

      {/* Desktop page title row */}
      {canEdit && (
        <div className="desktop-only" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}>{t('list.myTotes')}</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>{t('list.newTote')}</button>
        </div>
      )}

      {/* User bar */}
      <div className="user-bar mobile-only">
        <div className="user-bar-info">
          <div className="user-avatar-sm">{user?.name?.[0]?.toUpperCase()}</div>
          <span className="user-bar-name">{user?.name}</span>
          <span className={`role-badge role-${user?.role}`}>{t(`role.${user?.role}`)}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {user?.role === 'admin' && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>{t('list.users')}</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={logout}>{t('common.signOut')}</button>
        </div>
      </div>

      {totes.length > 0 && (
        <div className="status-bar">
          <div className="status-dot" />
          <div className="status-item">{t('list.totes')}: <span className="status-val">{totes.length}</span></div>
          <div className="status-item">{t('common.items')}: <span className="status-val">{totalItems}</span></div>
          {canEdit && <a href="/api/totes/export" className="status-export">{t('list.exportCsv')}</a>}
        </div>
      )}

      {/* Search — editor/admin only (viewers browse the grid) */}
      {canEdit && (
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="search-input"
            placeholder={t('list.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
      )}

      {/* Search results */}
      {searchResults !== null && (
        <div className="search-results">
          <div className="search-results-header">
            {searchResults.length === 0
              ? t('list.noResults', { q: search })
              : t('list.results', { n: searchResults.length, s: searchResults.length !== 1 ? 's' : '', q: search })}
          </div>
          {searchResults.map(item => (
            <div key={item.id} className="search-result-row" onClick={() => navigate(`/tote/${item.tote_id}`)}>
              <div className="search-result-item">{item.name}</div>
              <div className="search-result-tote">{t('list.inTote', { tote: item.tote_label })}</div>
              {item.tote_location && <div className="search-result-loc">📍 {item.tote_location}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Tag filter */}
      {allUsedTags.length > 0 && !searchResults && (
        <div className="tag-filter">
          <button className={`tag-chip ${!activeTag ? 'active' : ''}`} onClick={() => setActiveTag(null)}>{t('list.all')}</button>
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
            <div className="empty-title">{activeTag ? t('list.noTaggedTotes', { tag: activeTag }) : t('list.noTotesYet')}</div>
            <div className="empty-sub">
              {canEdit ? t('list.emptyEdit') : t('list.emptyView')}
            </div>
            {!activeTag && canEdit && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('list.createFirst')}</button>
            )}
          </div>
        ) : (
          <div className="tote-grid">
            {visibleTotes.map(tote => (
              <div key={tote.id} className="tote-card" onClick={() => navigate(`/tote/${tote.id}`)}>
                <div className="tote-card-inner">
                  <div className="tote-card-icon"><ToteIcon size={22} /></div>
                  <div className="tote-card-content">
                    <div className="tote-card-label">{tote.label}</div>
                    <div className="tote-card-loc">{tote.location ? `📍 ${tote.location}` : t('list.noLocation')}</div>
                    {tote.tags?.length > 0 && (
                      <div className="tote-tags">
                        {tote.tags.map(tag => <span key={tag} className="tote-tag">{tag}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="tote-card-right">
                    <div className="item-count">{tote.item_count}</div>
                    <div className="item-count-label">{t('common.itemsLower')}</div>
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
            <div className="modal-title">{t('list.modalTitle')}</div>
            <form onSubmit={createTote}>
              <div className="field">
                <label>{t('list.toteLabel')}</label>
                <input className="input input-full" placeholder={t('list.toteLabelPlaceholder')}
                  value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} autoFocus />
              </div>
              <div className="field">
                <label>{t('list.storageLocation')}</label>
                <input className="input input-full" placeholder={t('list.locationPlaceholder')}
                  value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="field">
                <label>{t('list.categories')}</label>
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
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? t('list.creating') : t('list.createTote')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
