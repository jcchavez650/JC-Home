import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ALL_TAGS = ['Garage', 'Kitchen', 'Bedroom', 'Office', 'Holiday', 'Tools', 'Clothes', 'Sports', 'Electronics', 'Other'];

export default function ToteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tote, setTote] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState('items');
  const [editingTote, setEditingTote] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [shareUrl, setShareUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef();
  const cameraRef = useRef();

  useEffect(() => { fetchTote(); }, [id]);

  async function fetchTote() {
    const res = await fetch(`/api/totes/${id}`);
    if (res.ok) {
      const data = await res.json();
      setTote(data);
      setEditForm({ label: data.label, location: data.location || '', tags: data.tags || [] });
    }
  }

  async function analyzePhoto(file) {
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await fetch(`/api/analyze/${id}`, { method: 'POST', body: fd });
      if (res.ok) { await fetchTote(); setTab('items'); }
      else { const err = await res.json(); alert('Analysis failed: ' + (err.error || 'Unknown')); }
    } catch (e) { alert('Upload failed: ' + e.message); }
    setUploading(false);
  }

  async function saveTote(e) {
    e.preventDefault();
    await fetch(`/api/totes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditingTote(false);
    fetchTote();
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

  async function saveItem(item) {
    await fetch(`/api/totes/${id}/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    setEditingItem(null);
    fetchTote();
  }

  async function deleteItem(itemId) {
    await fetch(`/api/totes/${id}/items/${itemId}`, { method: 'DELETE' });
    fetchTote();
  }

  async function deleteTote() {
    if (!confirm('DELETE THIS TOTE AND ALL CONTENTS?')) return;
    await fetch(`/api/totes/${id}`, { method: 'DELETE' });
    navigate('/');
  }

  async function getShareLink() {
    const res = await fetch(`/api/totes/${id}/share`, { method: 'POST' });
    const { token } = await res.json();
    const url = `${window.location.origin}/share/${token}`;
    setShareUrl(url);
    setTab('share');
  }

  async function revokeShare() {
    await fetch(`/api/totes/${id}/share`, { method: 'DELETE' });
    setShareUrl(null);
    fetchTote();
  }

  function copyShareUrl() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function printQR() {
    window.print();
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) analyzePhoto(file);
  }

  function toggleEditTag(tag) {
    setEditForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  }

  if (!tote) return (
    <div className="page-loading">
      <div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" />
      <span style={{ marginLeft: 8 }}>LOADING</span>
    </div>
  );

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-label { display: flex !important; }
        }
      `}</style>

      {/* Printable QR label */}
      <div className="print-label" style={{ display: 'none' }}>
        <div className="print-label-inner">
          {tote.qr_code && <img src={tote.qr_code} alt="QR" style={{ width: 160, height: 160 }} />}
          <div className="print-label-text">
            <div className="print-label-title">{tote.label}</div>
            {tote.location && <div className="print-label-loc">📍 {tote.location}</div>}
            <div className="print-label-count">{tote.items?.length || 0} ITEMS</div>
          </div>
        </div>
      </div>

      <div className="page">
        <div className="back-nav" onClick={() => navigate('/')}>← BACK TO INVENTORY</div>

        {/* Header */}
        {editingTote ? (
          <form onSubmit={saveTote} className="edit-tote-form">
            <div className="field">
              <label>Label</label>
              <input className="input input-full" value={editForm.label}
                onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} autoFocus />
            </div>
            <div className="field">
              <label>Location</label>
              <input className="input input-full" placeholder="Storage location"
                value={editForm.location}
                onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="field">
              <label>Categories</label>
              <div className="tag-picker">
                {ALL_TAGS.map(tag => (
                  <button key={tag} type="button"
                    className={`tag-chip ${editForm.tags?.includes(tag) ? 'active' : ''}`}
                    onClick={() => toggleEditTag(tag)}
                  >{tag}</button>
                ))}
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: 12, marginBottom: 20 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingTote(false)}>CANCEL</button>
              <button type="submit" className="btn btn-primary btn-sm">SAVE CHANGES</button>
            </div>
          </form>
        ) : (
          <div className="detail-header">
            <div className="detail-tag">
              <span style={{ color: 'var(--text-3)' }}>TOTE ID:</span>
              {id.slice(0, 8).toUpperCase()}
              <button className="edit-link" onClick={() => setEditingTote(true)}>✎ EDIT</button>
            </div>
            <div className="detail-title">{tote.label}</div>
            {tote.location && <div className="detail-loc">📍 {tote.location}</div>}
            {tote.tags?.length > 0 && (
              <div className="tote-tags" style={{ marginTop: 8 }}>
                {tote.tags.map(tag => <span key={tag} className="tote-tag">{tag}</span>)}
              </div>
            )}
            <div className="detail-stats">
              <div className="stat"><div className="stat-val">{tote.items?.length || 0}</div><div className="stat-label">Items</div></div>
              <div className="stat"><div className="stat-val">{tote.photos?.length || 0}</div><div className="stat-label">Scans</div></div>
            </div>
          </div>
        )}

        {/* AI Scanner */}
        <div className="camera-section">
          <div className="section-label">AI SCAN</div>
          {uploading ? (
            <div className="analyzing">
              <div className="scan-animation">
                <div className="scan-icon">📦</div>
                <div className="scan-line" />
              </div>
              <div className="analyzing-title">Scanning Contents</div>
              <div className="analyzing-sub">// AI identifying all items...</div>
            </div>
          ) : (
            <>
              <button className="btn btn-camera btn-full" onClick={() => cameraRef.current.click()}>
                📷 SCAN WITH CAMERA
              </button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                onChange={e => e.target.files[0] && analyzePhoto(e.target.files[0])} />
              <div className={`upload-area${dragOver ? ' drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current.click()}
              >
                <div className="upload-icon">🖼️</div>
                <div className="upload-text">Upload from Library</div>
                <div className="upload-hint">// drag & drop or tap to select</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files[0] && analyzePhoto(e.target.files[0])} />
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { key: 'items', label: `MANIFEST (${tote.items?.length || 0})` },
            { key: 'qr', label: 'QR LABEL' },
            { key: 'photos', label: `SCANS (${tote.photos?.length || 0})` },
            { key: 'share', label: 'SHARE' },
          ].map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Items */}
        {tab === 'items' && (
          <div className="section">
            <div className="section-label">ITEM MANIFEST</div>
            {tote.items?.length === 0 ? (
              <div className="empty-items">// no items logged — scan or add manually</div>
            ) : (
              tote.items.map(item => (
                <div key={item.id}>
                  {editingItem?.id === item.id ? (
                    <div className="item-edit-row">
                      <input className="input" style={{ flex: 1 }} value={editingItem.name}
                        onChange={e => setEditingItem(i => ({ ...i, name: e.target.value }))} />
                      <input className="input" style={{ width: 60 }} type="number" min="1" value={editingItem.quantity}
                        onChange={e => setEditingItem(i => ({ ...i, quantity: parseInt(e.target.value) || 1 }))} />
                      <button className="btn btn-primary btn-sm" onClick={() => saveItem(editingItem)}>✓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingItem(null)}>✕</button>
                    </div>
                  ) : (
                    <div className="item-row" onDoubleClick={() => setEditingItem({ ...item })}>
                      <div className="qty-tag">×{item.quantity}</div>
                      <div style={{ flex: 1 }}>
                        <div className="item-name">{item.name}</div>
                        {item.notes && <div className="item-notes">// {item.notes}</div>}
                      </div>
                      <button className="edit-item-btn" onClick={() => setEditingItem({ ...item })}>✎</button>
                      <button className="delete-btn" onClick={() => deleteItem(item.id)}>✕</button>
                    </div>
                  )}
                </div>
              ))
            )}
            <form onSubmit={addItem} className="add-item-row">
              <input className="input" placeholder="Add item manually..." value={newItem}
                onChange={e => setNewItem(e.target.value)} />
              <button type="submit" className="btn btn-primary btn-sm">ADD</button>
            </form>
          </div>
        )}

        {/* QR */}
        {tab === 'qr' && (
          <div className="section qr-box">
            <div className="section-label">TOTE QR LABEL</div>
            {tote.qr_code && (
              <>
                <div className="qr-wrap">
                  <img src={tote.qr_code} alt="QR Code" className="qr-img" />
                </div>
                <div className="qr-label">// SCAN TO ACCESS TOTE MANIFEST</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={tote.qr_code} download={`tote-${tote.label}-qr.png`}
                    className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', flex: 1 }}>
                    ↓ DOWNLOAD
                  </a>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={printQR}>
                    🖨 PRINT LABEL
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Photos */}
        {tab === 'photos' && (
          <div className="section">
            <div className="section-label">SCAN HISTORY</div>
            {tote.photos?.length === 0 ? (
              <div className="empty-items">// no scans on record</div>
            ) : (
              <div className="photo-grid">
                {tote.photos.map(photo => (
                  <div key={photo.id}>
                    <img src={`/uploads/${photo.filename}`} alt="Tote photo" className="photo-thumb"
                      onError={e => { e.target.style.display = 'none'; }} />
                    <div className="photo-date">{new Date(photo.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Share */}
        {tab === 'share' && (
          <div className="section">
            <div className="section-label">SHARE TOTE</div>
            {shareUrl || tote.share_token ? (
              <>
                <div className="share-url">{shareUrl || `${window.location.origin}/share/${tote.share_token}`}</div>
                <div className="share-hint">// anyone with this link can view this tote's manifest</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                    onClick={() => { const u = shareUrl || `${window.location.origin}/share/${tote.share_token}`; navigator.clipboard.writeText(u); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                    {copied ? '✓ COPIED' : '⎘ COPY LINK'}
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={revokeShare}>
                    REVOKE
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="empty-items">// no share link generated yet</div>
                <button className="btn btn-primary btn-full" style={{ marginTop: 12 }} onClick={getShareLink}>
                  GENERATE SHARE LINK
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <button className="btn btn-danger btn-full btn-sm" onClick={deleteTote}>DEREGISTER TOTE</button>
        </div>
      </div>
    </>
  );
}
