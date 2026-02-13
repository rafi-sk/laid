import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { VerifyEmail } from './pages/VerifyEmail';
import { ProfileSetup } from './pages/ProfileSetup';
import { Discover } from './pages/Discover';
import { Matches } from './pages/Matches';
import { Chat } from './pages/Chat';
import { AuthService } from './services/authService';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return AuthService.isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/register" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute>
              <ProfileSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/discover"
          element={
            <ProtectedRoute>
              <Discover />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matches"
          element={
            <ProtectedRoute>
              <Matches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:matchId"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
