import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const ROLE_LABELS = {
  manager: { label: "Manager", bg: "#eff6ff", color: "#1d4ed8" },
  admin: { label: "Admin", bg: "#ede9fe", color: "#5b21b6" },
  super_admin: { label: "Super Admin", bg: "#fef3c7", color: "#92400e" },
};

// Role cycle for toggle: manager → admin → super_admin → manager
const ROLE_CYCLE_SUPER = ["manager", "admin", "super_admin"];
const ROLE_CYCLE_ADMIN = ["manager", "admin"];

// Replace RoleToggleBadge component with this:
const RoleSelect = ({ user, cycle, onRoleChange, disabled }) => {
  const badge = ROLE_LABELS[user.role] || ROLE_LABELS.manager;
  return (
    <select
      value={user.role}
      disabled={disabled}
      onChange={(e) => onRoleChange(user, e.target.value)}
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        padding: "4px 10px",
        borderRadius: 20,
        border: `1.5px solid ${badge.color}40`,
        background: badge.bg,
        color: badge.color,
        cursor: disabled ? "not-allowed" : "pointer",
        outline: "none",
        appearance: "none", // hides default arrow
        WebkitAppearance: "none",
        paddingRight: 24, // space for custom arrow
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2364748b'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
      }}
    >
      {cycle.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r].label}
        </option>
      ))}
    </select>
  );
};

const UserCard = ({
  u,
  isSelf = false,
  editable,
  cycle,
  onRoleChange,
  onToggleActive,
  onApprove,
  onReject,
  updating,
  isPending = false,
}) => {
  const badge = ROLE_LABELS[u.role] || ROLE_LABELS.manager;

  return (
    <div
      style={{
        background: isSelf ? "#f8faff" : isPending ? "#fffbeb" : "#fff",
        border: `1.5px solid ${isSelf ? "#bfdbfe" : isPending ? "#fcd34d" : "#e8ecf0"}`,
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: !isPending && !u.isActive ? 0.55 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: isSelf
            ? "linear-gradient(135deg, #1e3a8a, #3b82f6)"
            : isPending
              ? "linear-gradient(135deg, #92400e, #f59e0b)"
              : "linear-gradient(135deg, #1e3a8a, #3b82f6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        {u.name?.[0]?.toUpperCase()}
      </div>

      {/* Name + Email */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#0f172a" }}
        >
          {u.name}{" "}
          {isSelf && (
            <span style={{ color: "#94a3b8", fontWeight: 400 }}>(you)</span>
          )}
          {isPending && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: "#fef3c7",
                color: "#92400e",
                padding: "2px 7px",
                borderRadius: 20,
              }}
            >
              Pending
            </span>
          )}
        </p>
        <p
          style={{
            margin: "1px 0 0",
            fontSize: 11,
            color: "#94a3b8",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {u.email}
        </p>
      </div>

      {/* Active dot (approved users only) */}
      {!isPending && !isSelf && (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: u.isActive ? "#22c55e" : "#f87171",
            flexShrink: 0,
          }}
          title={u.isActive ? "Active" : "Inactive"}
        />
      )}

      {/* Role badge / toggle */}
      {isSelf ? (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            padding: "4px 10px",
            borderRadius: 20,
            background: badge.bg,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
      ) : isPending ? (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            padding: "4px 10px",
            borderRadius: 20,
            background: badge.bg,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
      ) : editable && cycle ? (
        <RoleSelect
          user={u}
          cycle={cycle}
          onRoleChange={onRoleChange}
          disabled={updating === u._id}
        />
      ) : (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            padding: "4px 10px",
            borderRadius: 20,
            background: badge.bg,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
      )}

      {/* Approve / Reject for pending */}
      {isPending && (
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => onApprove(u._id)}
            disabled={updating === u._id}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: 8,
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#16a34a",
              cursor: "pointer",
            }}
          >
            Approve
          </button>
          <button
            onClick={() => onReject(u._id)}
            disabled={updating === u._id}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: 8,
              border: "1px solid #fecaca",
              background: "#fff5f5",
              color: "#ef4444",
              cursor: "pointer",
            }}
          >
            Reject
          </button>
        </div>
      )}

      {/* Activate / Deactivate for approved users */}
      {!isPending && editable && (
        <button
          onClick={() => onToggleActive(u._id, !u.isActive)}
          disabled={updating === u._id}
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: u.isActive ? "#fff5f5" : "#f0fdf4",
            color: u.isActive ? "#ef4444" : "#16a34a",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {u.isActive ? "Deactivate" : "Activate"}
        </button>
      )}
    </div>
  );
};

const SectionLabel = ({ children }) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      color: "#94a3b8",
      marginBottom: 8,
      marginTop: 20,
    }}
  >
    {children}
  </p>
);

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    fetch(`${API}/auth/users`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived lists ──────────────────────────────────────────────────────────
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
  const otherUsers = users;

  // Pending = not yet approved
  const pendingUsers = otherUsers.filter((u) => !u.isApproved);

  // Approved, split by role — order: super_admins → admins → managers
  const approvedOthers = otherUsers.filter((u) => u.isApproved);
  const superAdmins = approvedOthers.filter((u) => u.role === "super_admin");
  const admins = approvedOthers.filter((u) => u.role === "admin");
  const managers = approvedOthers.filter((u) => u.role === "manager");

  // ── Permissions ────────────────────────────────────────────────────────────
  const canEdit = (targetUser) => {
    const isSelf =
      targetUser._id === currentUser?.id ||
      targetUser._id?.toString() === currentUser?.id;
    if (isSelf) return false;
    if (isSuperAdmin) return true;
    if (isAdmin && targetUser.role !== "super_admin") return true;
    return false;
  };

  const getRoleCycle = (targetUser) => {
    if (isSuperAdmin) return ROLE_CYCLE_SUPER;
    if (isAdmin && targetUser.role !== "super_admin") return ROLE_CYCLE_ADMIN;
    return null;
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const changeRole = async (u, newRole) => {
    if (u.role === newRole) return;
    setUpdating(u._id);
    try {
      const res = await fetch(`${API}/auth/users/${u._id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading)
    return <div style={{ padding: 32, color: "#64748b" }}>Loading users…</div>;
  if (error)
    return <div style={{ padding: 32, color: "#ef4444" }}>{error}</div>;

  const commonCardProps = (u) => ({
    u,
    editable: canEdit(u),
    cycle: getRoleCycle(u),
    onRoleChange: changeRole,
    onToggleActive: toggleActive,
    onApprove: approveUser,
    onReject: rejectUser,
    updating,
  });

  return (
    <div style={{ padding: "24px", overflowY: "auto", height: "100%" }}>
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 4,
        }}
      >
        User Management
      </h1>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
        {isSuperAdmin
          ? "You can manage all users, approve registrations, and assign any role."
          : "You can approve, promote, or deactivate Managers and Admins."}
      </p>

      {/* ── Pending Approval ── */}
      {pendingUsers.length > 0 && (
        <>
          <SectionLabel>
            ⏳ Pending Approval ({pendingUsers.length})
          </SectionLabel>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 8,
            }}
          >
            {pendingUsers.map((u) => (
              <UserCard key={u._id} {...commonCardProps(u)} isPending />
            ))}
          </div>
        </>
      )}

      {/* ── You ── */}
      {selfUser && (
        <>
          <SectionLabel>You</SectionLabel>
          <UserCard
            {...commonCardProps(selfUser)}
            u={selfUser}
            isSelf
            editable={false}
          />
        </>
      )}

      {/* ── Super Admins (visible only to super_admin) ── */}
      {isSuperAdmin && superAdmins.length > 0 && (
        <>
          <SectionLabel>Super Admins</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {superAdmins.map((u) => (
              <UserCard key={u._id} {...commonCardProps(u)} />
            ))}
          </div>
        </>
      )}

      {/* ── Admins ── */}
      {admins.length > 0 && (
        <>
          <SectionLabel>Admins</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {admins.map((u) => (
              <UserCard key={u._id} {...commonCardProps(u)} />
            ))}
          </div>
        </>
      )}

      {/* ── Managers ── */}
      {managers.length > 0 && (
        <>
          <SectionLabel>Managers</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {managers.map((u) => (
              <UserCard key={u._id} {...commonCardProps(u)} />
            ))}
          </div>
        </>
      )}

      {otherUsers.filter((u) => u.isApproved).length === 0 &&
        pendingUsers.length === 0 && (
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 24 }}>
            No other users in the system yet.
          </p>
        )}
    </div>
  );
};

export default UserManagement;
