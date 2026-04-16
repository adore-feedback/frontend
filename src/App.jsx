import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Navbar from './pages/admin/Navbar';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminResult from './pages/admin/AdminResult';
import FormCreator from './pages/admin/FormCreator';
import PublicFeedbackForm from './pages/PublicFeedbackForm';

const AdminLayout = () => {
  return (
    <div className='bg-background font-body text-on-surface h-screen flex flex-col md:flex-row overflow-hidden'>
      <Navbar />
      {/* flex-1: Fills the remaining space.
          flex-col: Stacks mobile header (if any) and content vertically.
          md:flex-row: On tablets and larger, sidebar and content sit side-by-side.
      */}
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
        <Route path='/' element={<Navigate to="/admin" replace />} />
        <Route path='/form/:formId' element={<PublicFeedbackForm />} />

        <Route path='/admin' element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          {/* Create new form */}
          <Route element={<FormCreator />} path='forms/new' />
          {/* Edit an existing draft form — passes formId so FormCreator loads it */}
          <Route element={<FormCreator />} path='forms/edit/:editFormId' />
          <Route element={<AdminResult />} path='result' />
          <Route element={<AdminResult />} path='result/:formId' />
        </Route>
      </Routes>
    </div>
  );
};

export default App;