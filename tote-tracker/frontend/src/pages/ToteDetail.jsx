import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ToteIcon from '../components/ToteIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import LangToggle from '../components/LangToggle.jsx';

const ALL_TAGS = ['Garage', 'Kitchen', 'Bedroom', 'Office', 'Holiday', 'Tools', 'Clothes', 'Sports', 'Electronics', 'Other'];

export default function ToteDetail({ theme, onToggleTheme }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, apiFetch } = useAuth();
  const { t } = useLang();

  const canEdit = user?.role === 'editor' || user?.role === 'admin';

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
    const res = await apiFetch(`/api/totes/${id}`);
    if (res.ok) {
      const data = await res.json();
      setTote(data);
      setEditForm({ label: data.label, location: data.location || '', tags: data.tags || [] });
    }
  }

  // Shrink big phone photos before upload — the AI vision API caps images at ~5 MB,
  // and smaller images upload and analyze faster. Falls back to the original on error.
  async function downscaleImage(file, maxDim = 1568, quality = 0.85) {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      if (scale === 1 && file.size < 3 * 1024 * 1024) return file; // already small enough
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
      return blob || file;
    } catch {
      return file;
    }
  }

  async function analyzePhoto(file) {
    setUploading(true);
    try {
      const optimized = await downscaleImage(file);
      const fd = new FormData();
      fd.append('photo', optimized, 'scan.jpg');
      const res = await apiFetch(`/api/analyze/${id}`, { method: 'POST', body: fd });
      if (res.ok) { await fetchTote(); setTab('items'); }
      else { const err = await res.json().catch(() => ({})); alert(t('detail.analysisFailed') + (err.error || t('detail.unknown'))); }
    } catch (e) { alert(t('detail.uploadFailed') + e.message); }
    setUploading(false);
  }

  async function saveTote(e) {
    e.preventDefault();
    await apiFetch(`/api/totes/${id}`, {
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
    await apiFetch(`/api/totes/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItem.trim() }),
    });
    setNewItem('');
    fetchTote();
  }

  async function saveItem(item) {
    await apiFetch(`/api/totes/${id}/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    setEditingItem(null);
    fetchTote();
  }

  async function deleteItem(itemId) {
    await apiFetch(`/api/totes/${id}/items/${itemId}`, { method: 'DELETE' });
    fetchTote();
  }

  async function deleteTote() {
    if (!confirm(t('detail.confirmDelete'))) return;
    await apiFetch(`/api/totes/${id}`, { method: 'DELETE' });
    navigate('/');
  }

  async function getShareLink() {
    const res = await apiFetch(`/api/totes/${id}/share`, { method: 'POST' });
    const { token } = await res.json();
    const url = `${window.location.origin}/share/${token}`;
    setShareUrl(url);
    setTab('share');
  }

  async function revokeShare() {
    await apiFetch(`/api/totes/${id}/share`, { method: 'DELETE' });
    setShareUrl(null);
    fetchTote();
  }

  function copyShareUrl() {
    const u = shareUrl || `${window.location.origin}/share/${tote.share_token}`;
    navigator.clipboard.writeText(u);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <div className="loader-dots">
        <div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" />
      </div>
      <span>{t('common.loading')}</span>
    </div>
  );

  return (
    <>
      <style>{`@media print { body > * { display: none !important; } .print-label { display: flex !important; } }`}</style>

      <div className="print-label">
        <div className="print-label-inner">
          {tote.qr_code && <img src={tote.qr_code} alt="QR" style={{ width: 160, height: 160 }} />}
          <div className="print-label-text">
            <div className="print-label-title">{tote.label}</div>
            {tote.location && <div className="print-label-loc">📍 {tote.location}</div>}
            <div className="print-label-count">{tote.items?.length || 0} items</div>
          </div>
        </div>
      </div>

      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="back-nav" style={{ marginBottom: 0 }} onClick={() => navigate('/')}>{t('common.back')}</div>
          <div className="mobile-only" style={{ display: 'flex', gap: 8 }}>
            <button className="theme-toggle" onClick={onToggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>
            <LangToggle />
          </div>
        </div>

        {/* Header */}
        {editingTote && canEdit ? (
          <form onSubmit={saveTote} className="edit-tote-form">
            <div className="field">
              <label>{t('detail.label')}</label>
              <input className="input input-full" value={editForm.label}
                onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} autoFocus />
            </div>
            <div className="field">
              <label>{t('detail.location')}</label>
              <input className="input input-full" placeholder={t('detail.locationPlaceholder')}
                value={editForm.location}
                onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="field">
              <label>{t('detail.categories')}</label>
              <div className="tag-picker">
                {ALL_TAGS.map(tag => (
                  <button key={tag} type="button"
                    className={`tag-chip ${editForm.tags?.includes(tag) ? 'active' : ''}`}
                    onClick={() => toggleEditTag(tag)}
                  >{tag}</button>
                ))}
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: 12, marginBottom: 4 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingTote(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary btn-sm">{t('common.save')}</button>
            </div>
          </form>
        ) : (
          <div className="detail-header">
            <div className="detail-tag">
              <span style={{ color: 'var(--text-3)' }}>{t('detail.tote')}</span>
              {id.slice(0, 8).toUpperCase()}
              {canEdit && (
                <button className="edit-link" onClick={() => setEditingTote(true)}>{t('detail.edit')}</button>
              )}
            </div>
            <div className="detail-title">{tote.label}</div>
            {tote.location && <div className="detail-loc">📍 {tote.location}</div>}
            {tote.tags?.length > 0 && (
              <div className="tote-tags" style={{ marginTop: 8 }}>
                {tote.tags.map(tag => <span key={tag} className="tote-tag">{tag}</span>)}
              </div>
            )}
            <div className="detail-stats">
              <div className="stat">
                <div className="stat-val">{tote.items?.length || 0}</div>
                <div className="stat-label">{t('common.items')}</div>
              </div>
              <div className="stat">
                <div className="stat-val">{tote.photos?.length || 0}</div>
                <div className="stat-label">{t('detail.scans')}</div>
              </div>
            </div>
          </div>
        )}

        {/* AI Scanner — editors and admins only */}
        {canEdit && (
          <div className="camera-section">
            <div className="section-label">{t('detail.aiScan')}</div>
            {uploading ? (
              <div className="analyzing">
                <div className="scan-animation">
                  <div className="scan-icon"><ToteIcon size={24} /></div>
                  <div className="scan-line" />
                </div>
                <div className="analyzing-title">{t('detail.scanning')}</div>
                <div className="analyzing-sub">{t('detail.scanningSub')}</div>
              </div>
            ) : (
              <>
                <button className="btn btn-camera btn-full" onClick={() => cameraRef.current.click()}>
                  {t('detail.scanCamera')}
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
                  <div className="upload-text">{t('detail.uploadLibrary')}</div>
                  <div className="upload-hint">{t('detail.uploadHint')}</div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && analyzePhoto(e.target.files[0])} />
              </>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {[
            { key: 'items', label: t('detail.tabItems', { n: tote.items?.length || 0 }) },
            { key: 'qr', label: t('detail.tabQr') },
            { key: 'photos', label: t('detail.tabScans', { n: tote.photos?.length || 0 }) },
            { key: 'share', label: t('detail.tabShare') },
          ].map(tb => (
            <button key={tb.key} className={`tab ${tab === tb.key ? 'active' : ''}`} onClick={() => setTab(tb.key)}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* Items */}
        {tab === 'items' && (
          <div className="section">
            <div className="section-label">{t('detail.itemManifest')}</div>
            {tote.items?.length === 0 ? (
              <div className="empty-items">
                {canEdit ? t('detail.noItemsEdit') : t('detail.noItemsView')}
              </div>
            ) : (
              tote.items.map(item => (
                <div key={item.id}>
                  {editingItem?.id === item.id ? (
                    <div className="item-edit-row">
                      <input className="input" style={{ flex: 1 }} value={editingItem.name}
                        onChange={e => setEditingItem(i => ({ ...i, name: e.target.value }))} />
                      <input className="input" style={{ width: 64 }} type="number" min="1" value={editingItem.quantity}
                        onChange={e => setEditingItem(i => ({ ...i, quantity: parseInt(e.target.value) || 1 }))} />
                      <button className="btn btn-primary btn-sm" onClick={() => saveItem(editingItem)}>✓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingItem(null)}>✕</button>
                    </div>
                  ) : (
                    <div className="item-row" onDoubleClick={() => canEdit && setEditingItem({ ...item })}>
                      <div className="qty-tag">×{item.quantity}</div>
                      <div style={{ flex: 1 }}>
                        <div className="item-name">{item.name}</div>
                        {item.notes && <div className="item-notes">{item.notes}</div>}
                      </div>
                      {canEdit && (
                        <>
                          <button className="edit-item-btn" onClick={() => setEditingItem({ ...item })}>✎</button>
                          <button className="delete-btn" onClick={() => deleteItem(item.id)}>✕</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            {canEdit && (
              <form onSubmit={addItem} className="add-item-row">
                <input className="input" placeholder={t('detail.addItemPlaceholder')} value={newItem}
                  onChange={e => setNewItem(e.target.value)} />
                <button type="submit" className="btn btn-primary btn-sm">{t('detail.add')}</button>
              </form>
            )}
          </div>
        )}

        {/* QR */}
        {tab === 'qr' && (
          <div className="section qr-box">
            <div className="section-label">{t('detail.qrTitle')}</div>
            {tote.qr_code && (
              <>
                <div className="qr-wrap">
                  <img src={tote.qr_code} alt="QR Code" className="qr-img" />
                </div>
                <div className="qr-label">{t('detail.scanToAccess')}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={tote.qr_code} download={`tote-${tote.label}-qr.png`}
                    className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', flex: 1 }}>
                    {t('detail.download')}
                  </a>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => window.print()}>
                    {t('detail.printLabel')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Photos */}
        {tab === 'photos' && (
          <div className="section">
            <div className="section-label">{t('detail.scanHistory')}</div>
            {tote.photos?.length === 0 ? (
              <div className="empty-items">{t('detail.noScans')}</div>
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
            <div className="section-label">{t('detail.shareTote')}</div>
            {shareUrl || tote.share_token ? (
              <>
                <div className="share-url">{shareUrl || `${window.location.origin}/share/${tote.share_token}`}</div>
                <div className="share-hint">{t('detail.shareHint')}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={copyShareUrl}>
                    {copied ? t('detail.copied') : t('detail.copyLink')}
                  </button>
                  {canEdit && (
                    <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={revokeShare}>
                      {t('detail.revoke')}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="empty-items">{t('detail.noShareLink')}</div>
                {canEdit && (
                  <button className="btn btn-primary btn-full" style={{ marginTop: 12 }} onClick={getShareLink}>
                    {t('detail.generateShareLink')}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {canEdit && (
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-danger btn-full btn-sm" onClick={deleteTote}>{t('detail.deleteTote')}</button>
          </div>
        )}
      </div>
    </>
  );
}
