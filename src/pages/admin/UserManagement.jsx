import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const ROLE_LABELS = {
  manager: { label: 'Manager', bg: '#eff6ff', color: '#1d4ed8' },
  admin: { label: 'Admin', bg: '#ede9fe', color: '#5b21b6' },
  super_admin: { label: 'Super Admin', bg: '#fef3c7', color: '#92400e' },
};

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetch(`${API}/auth/users`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  const changeRole = async (userId, newRole) => {
    setUpdating(userId);
    try {
      const res = await fetch(`${API}/auth/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const toggleActive = async (userId, isActive) => {
    setUpdating(userId);
    try {
      const res = await fetch(`${API}/auth/users/${userId}/deactivate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isActive } : u));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  // What roles can this logged-in user assign?
  const getAllowedRoleOptions = (targetUser) => {
    if (isSuperAdmin) return ['manager', 'admin', 'super_admin'];
    if (isAdmin && targetUser.role !== 'super_admin') return ['manager', 'admin'];
    return null; // read-only
  };

  // Can the current user edit this target user?
  const canEdit = (targetUser) => {
    const isSelf = targetUser._id === currentUser?.id || targetUser._id?.toString() === currentUser?.id;
    if (isSelf) return false;
    if (isSuperAdmin) return true;
    if (isAdmin && targetUser.role !== 'super_admin') return true;
    return false;
  };

  if (loading) return <div style={{ padding: 32, color: '#64748b' }}>Loading users…</div>;
  if (error) return <div style={{ padding: 32, color: '#ef4444' }}>{error}</div>;

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>User Management</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
        {isSuperAdmin
          ? 'You can manage all users and assign any role.'
          : 'You can promote or demote Managers. Super Admin accounts are view-only.'}
      </p>

      {/* Role legend */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(ROLE_LABELS).map(([key, val]) => (
          <span key={key} style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.07em', padding: '3px 10px', borderRadius: 20,
            background: val.bg, color: val.color,
          }}>
            {val.label}
          </span>
        ))}
        <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>— role types in this system</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.map((u) => {
          const badge = ROLE_LABELS[u.role] || ROLE_LABELS.manager;
          const isSelf = u._id === currentUser?.id;
          const editable = canEdit(u);
          const roleOptions = getAllowedRoleOptions(u);

          return (
            <div key={u._id} style={{
              background: '#fff',
              border: '1px solid #e8ecf0',
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              opacity: u.isActive ? 1 : 0.55,
            }}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
              }}>
                {u.name?.[0]?.toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                  {u.name} {isSelf && <span style={{ color: '#94a3b8', fontWeight: 400 }}>(you)</span>}
                </p>
                <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email}
                </p>
              </div>

              {/* Status dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: u.isActive ? '#22c55e' : '#f87171',
                flexShrink: 0,
                title: u.isActive ? 'Active' : 'Inactive',
              }} title={u.isActive ? 'Active' : 'Inactive'} />

              {/* Role badge or selector */}
              {editable && roleOptions ? (
                <select
                  value={u.role}
                  disabled={updating === u._id}
                  onChange={(e) => changeRole(u._id, e.target.value)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px',
                    borderRadius: 20, border: '1px solid #e2e8f0',
                    background: badge.bg, color: badge.color,
                    cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
                  ))}
                </select>
              ) : (
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', padding: '3px 10px', borderRadius: 20,
                  background: badge.bg, color: badge.color,
                }}>
                  {badge.label}
                </span>
              )}

              {/* Activate / Deactivate */}
              {editable && (
                <button
                  onClick={() => toggleActive(u._id, !u.isActive)}
                  disabled={updating === u._id}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px',
                    borderRadius: 8, border: '1px solid #e2e8f0',
                    background: u.isActive ? '#fff5f5' : '#f0fdf4',
                    color: u.isActive ? '#ef4444' : '#16a34a',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserManagement;