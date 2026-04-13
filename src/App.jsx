import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/admin/AdminDashboard';
import Navbar from './pages/admin/Navbar';
import AdminResult from './pages/admin/AdminResult';
import FormCreator from './pages/admin/FormCreator';
import PublicFeedbackForm from './pages/PublicFeedbackForm';

const AdminLayout = () => {
  return (
    <div className='bg-background font-body text-on-surface min-h-screen flex'>
      <Navbar />
      <Outlet />
    </div>
  );
};

const App = () => {
  return (
    <div>
      <Routes>
        <Route path='/' element={<Navigate to="/admin" replace />} />
        <Route path='/form/:formId' element={<PublicFeedbackForm />} />

        <Route path='/admin' element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route element={<FormCreator />} path='forms/new' />
          <Route element={<AdminResult />} path='result' />
          <Route element={<AdminResult />} path='result/:formId' />
        </Route>

      </Routes>
    </div>
  );
};

export default App;
