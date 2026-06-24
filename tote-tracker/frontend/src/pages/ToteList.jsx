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
      <div className="page-header">
        <div>
          <div className="page-title">📦 Tote Tracker</div>
          <div className="page-subtitle">{totes.length} tote{totes.length !== 1 ? 's' : ''} tracked</div>
        </div>
        <button className="btn" onClick={() => setShowModal(true)}>+ New</button>
      </div>

      {totes.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📦</div>
          <div className="empty-title">No totes yet</div>
          <div style={{ marginBottom: 24 }}>Create your first tote to get started</div>
          <button className="btn" onClick={() => setShowModal(true)}>+ Create Tote</button>
        </div>
      ) : (
        <div className="tote-grid">
          {totes.map(t => (
            <div key={t.id} className="tote-card" onClick={() => navigate(`/tote/${t.id}`)}>
              <div className="tote-card-label">{t.label}</div>
              <div className="tote-card-loc">{t.location || 'No location set'}</div>
              <div className="tote-card-meta">
                <span className="badge">{t.item_count} items</span>
                <span className="badge">{t.photo_count} photos</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-title">Create New Tote</div>
            <form onSubmit={createTote}>
              <div className="field">
                <label>Label *</label>
                <input
                  className="input"
                  placeholder="e.g. Kitchen Supplies"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Location</label>
                <input
                  className="input"
                  placeholder="e.g. Garage Shelf 3"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={loading}>
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
