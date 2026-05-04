import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import Navbar from "./pages/admin/Navbar";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminResult from "./pages/admin/AdminResult";
import FormCreator from "./pages/admin/FormCreator";
import PublicFeedbackForm from "./pages/PublicFeedbackForm";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import UnauthorizedPage from "./pages/auth/UnauthorizedPage";
import ProtectedRoute from "./components/ProtectedRoute";
import UserManagement from "./pages/admin/UserManagement";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import { useAuth } from "./context/AuthContext";

const AdminLayout = () => {
  return (
    <div className="bg-background font-body text-on-surface h-screen flex flex-col md:flex-row overflow-hidden">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

// Redirects logged-in users away from /login and /register
const GuestOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={getRoleBasePath(user.role)} replace />;
  return children;
};

// Returns the base dashboard path for a given role
const getRoleBasePath = (role) => {
  if (role === "super_admin") return "/super_admin";
  if (role === "admin") return "/admin";
  return "/manager";
};

// Redirects root "/" based on role
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleBasePath(user.role)} replace />;
};

const App = () => {
  return (
    <div>
      <Routes>
        {/* ── Public / Guest only ── */}
        <Route
          path="/login"
          element={
            <GuestOnlyRoute>
              <LoginPage />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnlyRoute>
              <RegisterPage />
            </GuestOnlyRoute>
          }
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/form/:formId" element={<PublicFeedbackForm />} />

        {/* ── Root redirect based on role ── */}
        <Route path="/" element={<RootRedirect />} />

        {/* ══ SUPER ADMIN routes — /super_admin ══ */}
        <Route
          path="/super_admin"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="forms/new" element={<FormCreator />} />
          <Route path="forms/edit/:editFormId" element={<FormCreator />} />
          <Route path="result" element={<AdminResult />} />
          <Route path="result/:formId" element={<AdminResult />} />
        </Route>

        {/* ══ ADMIN routes — /admin ══ */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="forms/new" element={<FormCreator />} />
          <Route path="forms/edit/:editFormId" element={<FormCreator />} />
          <Route path="result" element={<AdminResult />} />
          <Route path="result/:formId" element={<AdminResult />} />
        </Route>

        {/* ══ MANAGER routes — /manager ══ */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={["manager", "admin", "super_admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="forms/new" element={<FormCreator />} />
          <Route path="forms/edit/:editFormId" element={<FormCreator />} />
          <Route path="result" element={<AdminResult />} />
          <Route path="result/:formId" element={<AdminResult />} />
          {/* Managers cannot access user management */}
        </Route>

        {/* ── Catch-all ── */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </div>
  );
};

export default App;