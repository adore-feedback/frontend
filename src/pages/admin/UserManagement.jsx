import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const ROLE_META = {
  manager: {
    label: "Manager",
    bg: "#eff6ff",
    color: "#1d4ed8",
    border: "#bfdbfe",
  },
  admin: { label: "Admin", bg: "#ede9fe", color: "#5b21b6", border: "#ddd6fe" },
  super_admin: {
    label: "Super Admin",
    bg: "#fef3c7",
    color: "#92400e",
    border: "#fde68a",
  },
};

const ROLE_CYCLE_SUPER = ["manager", "admin", "super_admin"];
const ROLE_CYCLE_ADMIN = ["manager", "admin"];

/* ─── Avatar ─────────────────────────────────────────────────────────────── */
const Avatar = ({ name, size = 40, gradient = "135deg, #1e3a8a, #3b82f6" }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      flexShrink: 0,
      background: `linear-gradient(${gradient})`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: 700,
      fontSize: size * 0.38,
      fontFamily: "'DM Sans', system-ui",
    }}
  >
    {name?.[0]?.toUpperCase() || "?"}
  </div>
);

/* ─── Role Badge ─────────────────────────────────────────────────────────── */
const RoleBadge = ({ role }) => {
  const m = ROLE_META[role] || ROLE_META.manager;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        padding: "3px 10px",
        borderRadius: 20,
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.border}`,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {m.label}
    </span>
  );
};

/* ─── Role Select ────────────────────────────────────────────────────────── */
const RoleSelect = ({ user, cycle, onRoleChange, disabled }) => {
  const m = ROLE_META[user.role] || ROLE_META.manager;
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <select
        value={user.role}
        disabled={disabled}
        onChange={(e) => onRoleChange(user, e.target.value)}
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          padding: "4px 28px 4px 10px",
          borderRadius: 20,
          border: `1.5px solid ${m.border}`,
          background: m.bg,
          color: m.color,
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          appearance: "none",
          WebkitAppearance: "none",
          fontFamily: "'DM Sans', system-ui",
        }}
      >
        {cycle.map((r) => (
          <option key={r} value={r}>
            {ROLE_META[r].label}
          </option>
        ))}
      </select>
      <svg
        style={{
          position: "absolute",
          right: 9,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
        width="9"
        height="6"
        viewBox="0 0 9 6"
        fill="none"
      >
        <path
          d="M1 1l3.5 4L8 1"
          stroke={m.color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

/* ─── Action Button ──────────────────────────────────────────────────────── */
const ActionBtn = ({ onClick, disabled, variant = "neutral", children }) => {
  const variants = {
    approve: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
    reject: { bg: "#fff5f5", color: "#ef4444", border: "#fecaca" },
    deactivate: { bg: "#fff5f5", color: "#ef4444", border: "#fecaca" },
    activate: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
    neutral: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  };
  const v = variants[variant] || variants.neutral;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "5px 12px",
        borderRadius: 8,
        border: `1px solid ${v.border}`,
        background: v.bg,
        color: v.color,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.55 : 1,
        fontFamily: "'DM Sans', system-ui",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
};

/* ─── Spinner ────────────────────────────────────────────────────────────── */
const Spinner = () => (
  <div
    style={{
      width: 14,
      height: 14,
      border: "2px solid #e2e8f0",
      borderTopColor: "#3b82f6",
      borderRadius: "50%",
      animation: "um-spin 0.6s linear infinite",
      flexShrink: 0,
    }}
  />
);

/* ─── User Card ──────────────────────────────────────────────────────────── */
const UserCard = ({
  u,
  isSelf,
  isPending,
  editable,
  cycle,
  onRoleChange,
  onToggleActive,
  onApprove,
  onReject,
  updating,
}) => {
  const isUpdating = updating === u._id;
  const isArchived = !isPending && !u.isActive;

  return (
    <div
      style={{
        background: isSelf ? "#f0f7ff" : isPending ? "#fffbeb" : "#fff",
        border: `1.5px solid ${isSelf ? "#bfdbfe" : isPending ? "#fcd34d" : "#e8ecf0"}`,
        borderRadius: 14,
        padding: "14px 16px",
        opacity: isArchived ? 0.6 : 1,
        transition: "all 0.2s",
      }}
    >
      {/* Top row: Avatar + Info + Status dot */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: editable || isPending ? 12 : 0,
        }}
      >
        <Avatar
          name={u.name}
          gradient={
            isSelf
              ? "135deg,#1e3a8a,#3b82f6"
              : isPending
                ? "135deg,#92400e,#f59e0b"
                : "135deg,#334155,#64748b"
          }
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {u.name}
            </span>
            {isSelf && (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>(you)</span>
            )}
            {isPending && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  background: "#fef3c7",
                  color: "#92400e",
                  padding: "2px 7px",
                  borderRadius: 20,
                  border: "1px solid #fde68a",
                }}
              >
                Pending
              </span>
            )}
          </div>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: "#64748b",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {u.email}
          </p>
        </div>

        {/* Active/inactive dot — approved non-self users */}
        {!isPending && !isSelf && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              background: u.isActive ? "#22c55e" : "#f87171",
            }}
            title={u.isActive ? "Active" : "Inactive"}
          />
        )}

        {isUpdating && <Spinner />}
      </div>

      {/* Bottom row: Role + Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          paddingTop: 2,
        }}
      >
        {/* Role */}
        <div>
          {isSelf || isPending || !editable || !cycle ? (
            <RoleBadge role={u.role} />
          ) : (
            <RoleSelect
              user={u}
              cycle={cycle}
              onRoleChange={onRoleChange}
              disabled={isUpdating}
            />
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {isPending && (
            <>
              <ActionBtn
                variant="approve"
                onClick={() => onApprove(u._id)}
                disabled={isUpdating}
              >
                ✓ Approve
              </ActionBtn>
              <ActionBtn
                variant="reject"
                onClick={() => onReject(u._id)}
                disabled={isUpdating}
              >
                ✕ Reject
              </ActionBtn>
            </>
          )}
          {!isPending && editable && (
            <ActionBtn
              variant={u.isActive ? "deactivate" : "activate"}
              onClick={() => onToggleActive(u._id, !u.isActive)}
              disabled={isUpdating}
            >
              {u.isActive ? "Deactivate" : "Activate"}
            </ActionBtn>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Section Header ─────────────────────────────────────────────────────── */
const SectionHeader = ({ label, count, color = "#94a3b8" }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      margin: "24px 0 10px",
    }}
  >
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color,
      }}
    >
      {label}
    </span>
    {count != null && (
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          background: color + "20",
          color,
          padding: "1px 8px",
          borderRadius: 99,
        }}
      >
        {count}
      </span>
    )}
    <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
  </div>
);

/* ─── Stats Bar ──────────────────────────────────────────────────────────── */
const StatsBar = ({ total, active, pending }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 12,
      marginBottom: 24,
    }}
  >
    {[
      { label: "Total Users", value: total, color: "#3b82f6" },
      { label: "Active", value: active, color: "#10b981" },
      { label: "Pending", value: pending, color: "#f59e0b" },
    ].map(({ label, value, color }) => (
      <div
        key={label}
        style={{
          background: "#fff",
          border: "1px solid #e8ecf0",
          borderRadius: 12,
          padding: "12px 14px",
          textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginTop: 3,
          }}
        >
          {label}
        </div>
      </div>
    ))}
  </div>
);

/* ═══ UserManagement ════════════════════════════════════════════════════════ */
const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);
  const [search, setSearch] = useState("");

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    fetch(`${API}/auth/users`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, []);

  /* ── Derived ── */
  const selfUser = currentUser
    ? {
        _id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        isActive: true,
        isApproved: true,
      }
    : null;

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  const pendingUsers = filtered.filter((u) => !u.isApproved);
  const approvedOthers = filtered.filter((u) => u.isApproved);
  const superAdmins = approvedOthers.filter((u) => u.role === "super_admin");
  const admins = approvedOthers.filter((u) => u.role === "admin");
  const managers = approvedOthers.filter((u) => u.role === "manager");

  const totalActive = users.filter((u) => u.isApproved && u.isActive).length;
  const totalPending = users.filter((u) => !u.isApproved).length;

  /* ── Permissions ── */
  const canEdit = (target) => {
    if (
      target._id === currentUser?.id ||
      target._id?.toString() === currentUser?.id
    )
      return false;
    if (isSuperAdmin) return true;
    if (isAdmin && target.role !== "super_admin") return true;
    return false;
  };
  const getRoleCycle = (target) => {
    if (isSuperAdmin) return ROLE_CYCLE_SUPER;
    if (isAdmin && target.role !== "super_admin") return ROLE_CYCLE_ADMIN;
    return null;
  };

  /* ── Actions ── */
  const changeRole = async (u, newRole) => {
    if (u.role === newRole) return;
    setUpdating(u._id);
    try {
      const res = await fetch(`${API}/auth/users/${u._id}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUsers((prev) =>
        prev.map((x) => (x._id === u._id ? { ...x, role: newRole } : x)),
      );
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
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isActive } : u)),
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const approveUser = async (userId) => {
    setUpdating(userId);
    try {
      const res = await fetch(`${API}/auth/users/${userId}/approve`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isApproved: true } : u)),
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const rejectUser = async (userId) => {
    if (!confirm("Reject and permanently remove this user?")) return;
    setUpdating(userId);
    try {
      const res = await fetch(`${API}/auth/users/${userId}/reject`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const commonProps = (u) => ({
    u,
    editable: canEdit(u),
    cycle: getRoleCycle(u),
    onRoleChange: changeRole,
    onToggleActive: toggleActive,
    onApprove: approveUser,
    onReject: rejectUser,
    updating,
  });

  /* ── Render ── */
  if (loading)
    return (
      <>
        <style>{CSS}</style>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: "3px solid #e2e8f0",
              borderTopColor: "#3b82f6",
              borderRadius: "50%",
              animation: "um-spin 0.6s linear infinite",
            }}
          />
          <span
            style={{
              fontSize: 13,
              color: "#64748b",
              fontWeight: 600,
              fontFamily: "'DM Sans', system-ui",
            }}
          >
            Loading users…
          </span>
        </div>
      </>
    );

  if (error)
    return (
      <div
        style={{
          padding: 32,
          color: "#ef4444",
          fontFamily: "'DM Sans', system-ui",
        }}
      >
        {error}
      </div>
    );

  return (
    <>
      <style>{CSS}</style>
      <div className="um-root">
        {/* ── Page Header ── */}
        <div className="um-header">
          <div>
            <h1 className="um-title">User Management</h1>
            <p className="um-subtitle">
              {isSuperAdmin
                ? "Manage all users, approve registrations, and assign roles."
                : "Approve, promote, or deactivate Managers and Admins."}
            </p>
          </div>
        </div>

        {/* ── Stats ── */}
        <StatsBar
          total={users.length + 1}
          active={totalActive + 1}
          pending={totalPending}
        />

        {/* ── Search ── */}
        <div className="um-search-wrap">
          <svg
            className="um-search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="um-search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="um-search-clear" onClick={() => setSearch("")}>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Pending ── */}
        {pendingUsers.length > 0 && (
          <div className="um-section">
            <SectionHeader
              label="⏳ Pending Approval"
              count={pendingUsers.length}
              color="#d97706"
            />
            <div className="um-list">
              {pendingUsers.map((u) => (
                <UserCard key={u._id} {...commonProps(u)} isPending />
              ))}
            </div>
          </div>
        )}

        {/* ── You ── */}
        {selfUser && (
          <div className="um-section">
            <SectionHeader label="You" color="#3b82f6" />
            <UserCard
              {...commonProps(selfUser)}
              u={selfUser}
              isSelf
              editable={false}
            />
          </div>
        )}

        {/* ── Super Admins ── */}
        {isSuperAdmin && superAdmins.length > 0 && (
          <div className="um-section">
            <SectionHeader
              label="Super Admins"
              count={superAdmins.length}
              color="#92400e"
            />
            <div className="um-list">
              {superAdmins.map((u) => (
                <UserCard key={u._id} {...commonProps(u)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Admins ── */}
        {admins.length > 0 && (
          <div className="um-section">
            <SectionHeader
              label="Admins"
              count={admins.length}
              color="#5b21b6"
            />
            <div className="um-list">
              {admins.map((u) => (
                <UserCard key={u._id} {...commonProps(u)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Managers ── */}
        {managers.length > 0 && (
          <div className="um-section">
            <SectionHeader
              label="Managers"
              count={managers.length}
              color="#1d4ed8"
            />
            <div className="um-list">
              {managers.map((u) => (
                <UserCard key={u._id} {...commonProps(u)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Empty ── */}
        {approvedOthers.length === 0 &&
          pendingUsers.length === 0 &&
          !search && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
                color: "#94a3b8",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                No other users yet
              </p>
              <p style={{ fontSize: 13, margin: "4px 0 0" }}>
                Users will appear here once they register.
              </p>
            </div>
          )}

        {/* ── No search results ── */}
        {search && approvedOthers.length === 0 && pendingUsers.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "32px 20px",
              color: "#94a3b8",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600 }}>
              No users found for "{search}"
            </p>
          </div>
        )}
      </div>
    </>
  );
};

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
@keyframes um-spin { to { transform: rotate(360deg); } }

.um-root {
  padding: 24px 20px 60px;
  max-width: 100%;
  margin: 0;
  font-family: 'DM Sans', system-ui, sans-serif;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
}

.um-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.um-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.um-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.um-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.um-search-icon {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  pointer-events: none;
}

.um-search {
  width: 100%;
  padding: 10px 36px 10px 36px;
  background: #fff;
  border: 1.5px solid #e8ecf0;
  border-radius: 11px;
  font-size: 13px;
  color: #0f172a;
  outline: none;
  font-family: 'DM Sans', system-ui, sans-serif;
  box-sizing: border-box;
  transition: border 0.15s, box-shadow 0.15s;
}

.um-search:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.um-search-clear {
  position: absolute;
  right: 10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e2e8f0;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: background 0.13s;
}

.um-search-clear:hover { background: #cbd5e1; }

.um-section { margin-bottom: 8px; }

.um-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

@media (max-width: 600px) {
  .um-root { padding: 16px 12px 80px; }
  .um-title { font-size: 18px; }
  .um-list { grid-template-columns: 1fr; }
}

@media (max-width: 400px) {
  .um-root { padding: 12px 10px 80px; }
  .um-title { font-size: 16px; }
}

@media (min-width: 601px) {
  .um-root { padding: 24px 32px 60px; }
  .um-title { font-size: 24px; }
}

@media (min-width: 900px) {
  .um-root { padding: 28px 40px 60px; }
}
`;

export default UserManagement;