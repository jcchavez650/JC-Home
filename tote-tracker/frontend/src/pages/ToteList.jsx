import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ToteList() {
  const [totes, setTotes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ label: '', location: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchTotes(); }, []);

  async function fetchTotes() {
    const res = await fetch('/api/totes');
    setTotes(await res.json());
  }

  async function createTote(e) {
    e.preventDefault();
    if (!form.label.trim()) return;
    setLoading(true);
    await fetch('/api/totes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ label: '', location: '' });
    setShowModal(false);
    setLoading(false);
    fetchTotes();
  }

  return (
    <div className="page">
      <div className="app-header">
        <div className="app-logo">
          <div className="logo-icon">📦</div>
          <div>
            <div className="app-title">Tote Tracker</div>
            <div className="app-subtitle">{totes.length} tote{totes.length !== 1 ? 's' : ''} stored</div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          + New Tote
        </button>
      </div>

      {totes.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📦</div>
          <div className="empty-title">No totes yet</div>
          <div className="empty-sub">Create your first tote and start scanning items with AI</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Create First Tote
          </button>
        </div>
      ) : (
        <div className="tote-grid">
          {totes.map(t => (
            <div key={t.id} className="tote-card" onClick={() => navigate(`/tote/${t.id}`)}>
              <div className="tote-card-top">
                <div className="tote-card-label">{t.label}</div>
                <span className="tote-card-arrow">›</span>
              </div>
              {t.location && (
                <div className="tote-card-loc">
                  <span>📍</span> {t.location}
                </div>
              )}
              <div className="tote-card-meta">
                <span className={`badge ${t.item_count > 0 ? 'badge-accent' : ''}`}>
                  {t.item_count} item{t.item_count !== 1 ? 's' : ''}
                </span>
                <span className="badge">{t.photo_count} photo{t.photo_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-drag" />
            <div className="modal-title">New Tote</div>
            <form onSubmit={createTote}>
              <div className="field">
                <label>Label *</label>
                <input
                  className="input input-full"
                  placeholder="e.g. Kitchen Supplies"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Location</label>
                <input
                  className="input input-full"
                  placeholder="e.g. Garage Shelf 3"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Tote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
