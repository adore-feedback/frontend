import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const UnauthorizedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-primary mb-4">403</p>
        <h1 className="text-2xl font-semibold text-on-surface mb-2">Access Denied</h1>
        <p className="text-sm text-on-surface/60 mb-6">
          Your role ({user?.role || 'unknown'}) doesn&apos;t have permission to view this page.
        </p>
        <button
          onClick={() => navigate('/admin')}
          className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;