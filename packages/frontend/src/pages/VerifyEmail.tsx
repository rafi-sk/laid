import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthService } from '../services/authService';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    const verify = async () => {
      try {
        const result = await AuthService.verifyEmail(token);
        setStatus('success');
        setMessage(result.message);
        setTimeout(() => navigate('/login'), 3000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed');
      }
    };

    verify();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Verifying your email...
            </h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Email Verified!
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-6xl mb-4">✗</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};
