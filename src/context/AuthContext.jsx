import { createContext, useContext, useState, useEffect } from "react";

const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { id, name, email, role }
  const [loading, setLoading] = useState(true); // true while fetching /me

  // On app load, check if we already have a session
  useEffect(() => {
    // ── 1. Set up interceptor FIRST before any fetch ──
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      // Auto-inject credentials for all API calls
      if (typeof args[0] === "string" && args[0].includes("/api/")) {
        if (typeof args[1] === "object") {
          args[1] = { ...args[1], credentials: "include" };
        } else {
          args[1] = { credentials: "include" };
        }
      }
      const response = await originalFetch(...args);
      const url = args[0]?.toString() || "";
      const isApiCall = url.includes("/api/");

      const isAuthRoute =
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/me") ||
        url.includes("/auth/forgot-password") ||
        url.includes("/auth/reset-password");

      if (
        isApiCall &&
        !isAuthRoute &&
        (response.status === 401 || response.status === 403)
      ) {
        const clone = response.clone();
        const data = await clone.json().catch(() => ({}));
        const forceLogout =
          data.message?.includes("deactivated") ||
          data.message?.includes("Not authenticated") ||
          data.message?.includes("no longer exists") ||
          data.message?.includes("Account deactivated") ||
          response.status === 401;

        if (forceLogout && window.location.pathname !== "/login") {
          setUser(null);
          window.location.href = "/login";
        }
      }
      return response;
    };

    // ── 2. NOW check session — interceptor is already active ──
    fetch(`${API}/auth/me`, {
      credentials: "include",
      headers: { "Cache-Control": "no-cache" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // ── 3. Cleanup ──
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    return data;
  };

  const logout = async () => {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  // Role helpers
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;
  const isManager = !!user; // all logged-in users have at least manager rights

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isSuperAdmin,
        isAdmin,
        isManager,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
