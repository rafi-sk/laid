import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../services/authService';

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 md:hidden">
      <div className="flex justify-around items-center">
        <button
          onClick={() => navigate('/discover')}
          className={`flex flex-col items-center ${
            isActive('/discover') ? 'text-primary' : 'text-gray-600'
          }`}
        >
          <span className="text-2xl">🔥</span>
          <span className="text-xs mt-1">Discover</span>
        </button>

        <button
          onClick={() => navigate('/matches')}
          className={`flex flex-col items-center ${
            isActive('/matches') ? 'text-primary' : 'text-gray-600'
          }`}
        >
          <span className="text-2xl">💕</span>
          <span className="text-xs mt-1">Matches</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center text-gray-600"
        >
          <span className="text-2xl">👤</span>
          <span className="text-xs mt-1">Logout</span>
        </button>
      </div>
    </nav>
  );
};
