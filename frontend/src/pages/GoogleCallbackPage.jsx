import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    if (accessToken && refreshToken) {
      loginWithTokens(accessToken, refreshToken);
      navigate('/profile', { replace: true });
    } else {
      navigate('/login?error=google_failed', { replace: true });
    }
  }, []);

  return <p style={{ textAlign: 'center', marginTop: 60 }}>מתחבר...</p>;
}
