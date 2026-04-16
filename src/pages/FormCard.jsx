/**
 * FormCard.jsx
 *
 * Admin dashboard card for a single form.
 * Shows: title, response count, status badge + toggle, share link copy button.
 *
 * Props:
 *   form       — form object from GET /api/forms (with responseCount, status, slug, _id)
 *   userId     — current admin's user id (for x-user-id header)
 *   onUpdated  — callback(updatedForm) after a status change
 *   onDeleted  — callback(formId) after deletion
 *   baseUrl    — optional override for share link origin (default: window.location.origin)
 */

import { useState } from 'react';

const STATUS_META = {
  draft:  { label: 'Draft',  color: '#6b7280', bg: '#f3f4f6' },
  live:   { label: 'Live',   color: '#16a34a', bg: '#dcfce7' },
  closed: { label: 'Closed', color: '#dc2626', bg: '#fee2e2' },
};

// Cycle: draft → live → closed → draft
const NEXT_STATUS = { draft: 'live', live: 'closed', closed: 'draft' };

export default function FormCard({ form, userId, onUpdated, onDeleted, baseUrl }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const origin = baseUrl || window.location.origin;
  const shareUrl = `${origin}/forms/${form.slug || form._id}`;

  const statusMeta = STATUS_META[form.status] || STATUS_META.draft;
  const nextStatus = NEXT_STATUS[form.status];

  // ── Toggle status ──
  const handleStatusToggle = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/forms/${form._id || form.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');
      onUpdated?.(data.form);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Copy share link ──
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={styles.card}>
      {/* Header row */}
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <h3 style={styles.title}>{form.title}</h3>
          {form.description && (
            <p style={styles.description}>{form.description}</p>
          )}
        </div>

        {/* Status badge + toggle */}
        <div style={styles.statusGroup}>
          <span
            style={{
              ...styles.statusBadge,
              color: statusMeta.color,
              background: statusMeta.bg,
            }}
          >
            {statusMeta.label}
          </span>
          <button
            onClick={handleStatusToggle}
            disabled={loading}
            style={styles.toggleBtn}
            title={`Switch to ${nextStatus}`}
          >
            {loading ? '…' : `→ ${NEXT_STATUS[form.status]}`}
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {/* Stats row */}
      <div style={styles.statsRow}>
        <StatPill
          icon="📋"
          value={form.questionCount ?? (form.questions?.length ?? 0)}
          label="questions"
        />
        <StatPill
          icon="✉️"
          value={form.responseCount ?? 0}
          label={form.responseCount === 1 ? 'response' : 'responses'}
          highlight={form.responseCount > 0}
        />
        {form.averageRating != null && (
          <StatPill
            icon="⭐"
            value={form.averageRating}
            label="avg rating"
          />
        )}
      </div>

      {/* Share link row */}
      <div style={styles.shareRow}>
        <span style={styles.shareLabel}>Share link</span>
        <div style={styles.shareLinkBox}>
          <span style={styles.shareUrl}>{shareUrl}</span>
          <button
            onClick={handleCopyLink}
            style={{
              ...styles.copyBtn,
              background: copied ? '#16a34a' : '#4f46e5',
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Footer actions */}
      <div style={styles.actions}>
        <a href={`/admin/forms/${form._id || form.id}/results`} style={styles.actionLink}>
          View Results →
        </a>
        <button
          onClick={() => onDeleted?.(form._id || form.id)}
          style={styles.deleteBtn}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function StatPill({ icon, value, label, highlight }) {
  return (
    <div
      style={{
        ...styles.statPill,
        background: highlight ? '#eff6ff' : '#f9fafb',
        border: highlight ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
      }}
    >
      <span>{icon}</span>
      <strong style={{ color: highlight ? '#1d4ed8' : '#111827' }}>{value}</strong>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleGroup: { flex: 1, minWidth: 0 },
  title: { margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' },
  description: { margin: '4px 0 0', fontSize: 13, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusGroup: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  statusBadge: {
    fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
    letterSpacing: '0.05em', textTransform: 'uppercase',
  },
  toggleBtn: {
    fontSize: 11, padding: '3px 8px', borderRadius: 6,
    border: '1px solid #d1d5db', background: '#fff', color: '#374151',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  error: { margin: 0, fontSize: 13, color: '#dc2626' },
  statsRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  statPill: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', borderRadius: 999, fontSize: 13,
  },
  statLabel: { color: '#6b7280', fontSize: 12 },
  shareRow: { display: 'flex', flexDirection: 'column', gap: 5 },
  shareLabel: { fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' },
  shareLinkBox: {
    display: 'flex', alignItems: 'center',
    background: '#f9fafb', border: '1px solid #e5e7eb',
    borderRadius: 8, overflow: 'hidden',
  },
  shareUrl: {
    flex: 1, padding: '7px 12px', fontSize: 13, color: '#374151',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  copyBtn: {
    padding: '7px 14px', fontSize: 13, fontWeight: 600,
    color: '#fff', border: 'none', cursor: 'pointer',
    transition: 'background 0.2s', whiteSpace: 'nowrap',
  },
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  actionLink: { fontSize: 13, color: '#4f46e5', textDecoration: 'none', fontWeight: 600 },
  deleteBtn: {
    fontSize: 13, color: '#dc2626', background: 'none',
    border: 'none', cursor: 'pointer', padding: 0,
  },
};