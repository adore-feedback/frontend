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

const App = () => {
  return (
    <div>
      <Routes>
        {/* ── Public ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/form/:formId" element={<PublicFeedbackForm />} />

        {/* ── Redirect root to /admin ── */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* ── Protected Admin area (all logged-in users) ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Super Admin only — user management */}
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route index element={<AdminDashboard />} />

          {/* Managers and above — form CRUD */}
          <Route
            path="forms/new"
            element={
              <ProtectedRoute
                allowedRoles={["manager", "admin", "super_admin"]}
              >
                <FormCreator />
              </ProtectedRoute>
            }
          />
          <Route
            path="forms/edit/:editFormId"
            element={
              <ProtectedRoute
                allowedRoles={["manager", "admin", "super_admin"]}
              >
                <FormCreator />
              </ProtectedRoute>
            }
          />

          {/* Results — all roles */}
          <Route element={<AdminResult />} path="result" />
          <Route element={<AdminResult />} path="result/:formId" />
        </Route>

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
};

export default App;
