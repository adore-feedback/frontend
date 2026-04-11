import { Routes, Route, Outlet, Link } from 'react-router-dom';
import AdminDashboard from './pages/admin/AdminDashboard';
import Navbar from './pages/admin/Navbar';
import AdminResult from './pages/admin/AdminResult';

const Index = () => {
  return (
    <div className='text-center block mt-100'>
      {`No Page go to /admin route here -> `}
      <Link to="/admin" className="text-blue-500 font-bold">
        Link
      </Link>
    </div>
  );
};

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
        <Route path='/' element={<Index />} />

        <Route path='/admin' element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route element={<AdminResult />} path='result' />
        </Route>

      </Routes>
    </div>
  );
};

export default App;