import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ToteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tote, setTote] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState('items');
  const fileRef = useRef();
  const cameraRef = useRef();

  useEffect(() => { fetchTote(); }, [id]);

  async function fetchTote() {
    const res = await fetch(`/api/totes/${id}`);
    if (res.ok) setTote(await res.json());
  }

  async function analyzePhoto(file) {
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await fetch(`/api/analyze/${id}`, { method: 'POST', body: fd });
      if (res.ok) { await fetchTote(); setTab('items'); }
      else {
        const err = await res.json();
        alert('Analysis failed: ' + (err.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Upload failed: ' + e.message);
    }
    setUploading(false);
  }

  async function addItem(e) {
    e.preventDefault();
    if (!newItem.trim()) return;
    await fetch(`/api/totes/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItem.trim() }),
    });
    setNewItem('');
    fetchTote();
  }

  async function deleteItem(itemId) {
    await fetch(`/api/totes/${id}/items/${itemId}`, { method: 'DELETE' });
    fetchTote();
  }

  async function deleteTote() {
    if (!confirm('Delete this tote and all its contents?')) return;
    await fetch(`/api/totes/${id}`, { method: 'DELETE' });
    navigate('/');
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) analyzePhoto(file);
  }

  if (!tote) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>;

  return (
    <div className="page">
      <div className="back-nav" onClick={() => navigate('/')}>← All Totes</div>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc' }}>{tote.label}</div>
        {tote.location && <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{tote.location}</div>}
      </div>

      {/* Camera / Upload — always front and center */}
      <div className="section">
        <div className="section-title">📸 Scan Tote with AI</div>
        {uploading ? (
          <div className="analyzing">
            <div className="spinner" />
            <div>Analyzing photo with AI...</div>
            <div style={{ fontSize: 13, marginTop: 6, color: '#475569' }}>Identifying all items in the tote</div>
          </div>
        ) : (
          <>
            <button className="btn btn-camera btn-full" onClick={() => cameraRef.current.click()}>
              📷 Take Photo
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && analyzePhoto(e.target.files[0])} />

            <div
              className={`upload-area${dragOver ? ' drag-over' : ''}`}
              style={{ marginTop: 12 }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}
            >
              <div className="upload-icon">🖼️</div>
              <div className="upload-text">Or upload from gallery</div>
              <div className="upload-hint">AI will identify every item</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && analyzePhoto(e.target.files[0])} />
          </>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'items', label: `Items (${tote.items?.length || 0})` },
          { key: 'qr', label: 'QR Code' },
          { key: 'photos', label: `Photos (${tote.photos?.length || 0})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn btn-sm ${tab === t.key ? '' : 'btn-ghost'}`}
            style={{ flex: 1 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Items tab */}
      {tab === 'items' && (
        <div className="section">
          {tote.items?.length === 0 && (
            <div style={{ color: '#475569', textAlign: 'center', padding: '16px 0', fontSize: 14 }}>
              No items yet — take a photo or add manually below
            </div>
          )}
          {tote.items?.map(item => (
            <div key={item.id} className="item-row">
              <div className="qty-badge">{item.quantity}</div>
              <div style={{ flex: 1 }}>
                <div className="item-name">{item.name}</div>
                {item.notes && <div className="item-notes">{item.notes}</div>}
              </div>
              <button className="delete-btn" onClick={() => deleteItem(item.id)}>✕</button>
            </div>
          ))}
          <form onSubmit={addItem} className="add-item-row">
            <input
              className="input"
              placeholder="Add item manually..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
            />
            <button type="submit" className="btn">Add</button>
          </form>
        </div>
      )}

      {/* QR tab */}
      {tab === 'qr' && (
        <div className="section qr-box">
          {tote.qr_code && (
            <>
              <img src={tote.qr_code} alt="QR Code" />
              <div className="qr-label">Scan to view tote contents</div>
              <a
                href={tote.qr_code}
                download={`tote-${tote.label}-qr.png`}
                className="btn"
                style={{ textDecoration: 'none', marginTop: 8 }}
              >
                Download QR Code
              </a>
            </>
          )}
        </div>
      )}

      {/* Photos tab */}
      {tab === 'photos' && (
        <div className="section">
          {tote.photos?.length === 0 && (
            <div style={{ color: '#475569', textAlign: 'center', padding: '16px 0', fontSize: 14 }}>
              No photos yet
            </div>
          )}
          <div className="photo-grid">
            {tote.photos?.map(photo => (
              <div key={photo.id}>
                <img
                  src={`/uploads/${photo.filename}`}
                  alt="Tote photo"
                  className="photo-thumb"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div className="photo-date">{new Date(photo.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete tote */}
      <div style={{ marginTop: 8, paddingTop: 8 }}>
        <button className="btn btn-danger btn-full btn-sm" onClick={deleteTote}>
          Delete This Tote
        </button>
      </div>
    </div>
  );
}
