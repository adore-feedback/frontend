import { Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/admin/AdminDashboard';


const Index = () => {
  return (
    <div className='text-center block mt-100'>
      {`No Page go to /admin route here ->`} <a className='text-blue-500 font-bold'  href='/admin'>
        Link
      </a>
    </div>
  )
}

const App = () => {
  return (
    <div>
      <Routes>
        <Route element={<Index />} path='/' />
        <Route element={<AdminDashboard />} path='/admin' />
      </Routes>
    </div>
  )
}

export default App
