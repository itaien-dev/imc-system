import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/profile');
    } catch (err) {
      setError(err.response?.data?.error || 'דוא"ל או סיסמה שגויים');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f5f6f8',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 8,
          width: 300,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: 4 }}>התחברות למערכת</h2>
        <p style={{ textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 20 }}>עמותת מ.ל.א</p>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>דוא"ל</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 12, direction: 'rtl' }}
        />

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>סיסמה</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 6, direction: 'rtl' }}
        />

        <div style={{ textAlign: 'left', marginBottom: 16 }}>
          <Link to="/forgot-password" style={{ fontSize: 12 }}>
            שכחתי סיסמה
          </Link>
        </div>

        {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, fontWeight: 500 }}>
          {loading ? 'מתחבר...' : 'התחבר'}
        </button>
      </form>
    </div>
  );
}
