import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const s = {
  container: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 700, color: '#f8fafc' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  btn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  card: { background: '#1e293b', borderRadius: 12, padding: 20, cursor: 'pointer', border: '1px solid #334155', transition: 'border-color 0.15s' },
  cardLabel: { fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 },
  cardLoc: { color: '#64748b', fontSize: 13, marginBottom: 12 },
  cardMeta: { display: 'flex', gap: 16 },
  badge: { background: '#0f172a', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#94a3b8' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalBox: { background: '#1e293b', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, border: '1px solid #334155' },
  modalTitle: { fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#f1f5f9' },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 },
  input: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 15 },
  actions: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 },
  btnCancel: { background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 15, cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '80px 0', color: '#475569' },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
};

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
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Tote Tracker</div>
          <div style={s.subtitle}>{totes.length} tote{totes.length !== 1 ? 's' : ''} tracked</div>
        </div>
        <button style={s.btn} onClick={() => setShowModal(true)}>+ New Tote</button>
      </div>

      {totes.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>📦</div>
          <div style={{ fontSize: 18, marginBottom: 8 }}>No totes yet</div>
          <div>Create your first tote to get started</div>
        </div>
      ) : (
        <div style={s.grid}>
          {totes.map(t => (
            <div
              key={t.id}
              style={s.card}
              onClick={() => navigate(`/tote/${t.id}`)}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
            >
              <div style={s.cardLabel}>{t.label}</div>
              <div style={s.cardLoc}>{t.location || 'No location set'}</div>
              <div style={s.cardMeta}>
                <span style={s.badge}>{t.item_count} items</span>
                <span style={s.badge}>{t.photo_count} photos</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={s.modalBox}>
            <div style={s.modalTitle}>Create New Tote</div>
            <form onSubmit={createTote}>
              <div style={s.field}>
                <label style={s.label}>Label *</label>
                <input
                  style={s.input}
                  placeholder="e.g. Kitchen Supplies, Winter Clothes"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  autoFocus
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Location</label>
                <input
                  style={s.input}
                  placeholder="e.g. Garage, Basement Shelf 3"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div style={s.actions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
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
