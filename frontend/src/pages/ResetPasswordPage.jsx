import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import * as authApi from '../api/auth';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login', { state: { message: 'הסיסמה עודכנה בהצלחה — אפשר להתחבר' } });
    } catch (err) {
      setError(err.response?.data?.error || 'הקישור אינו תקף או שפג תוקפו');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f6f8', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ background: '#fff', padding: 32, borderRadius: 8, width: 300, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <p style={{ color: '#c0392b' }}>קישור לא תקף.</p>
          <Link to="/forgot-password">בקש קישור חדש</Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f6f8', fontFamily: 'Arial, sans-serif' }}>
      <form
        onSubmit={handleSubmit}
        style={{ background: '#fff', padding: 32, borderRadius: 8, width: 300, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>הגדרת סיסמה חדשה</h2>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>סיסמה חדשה</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          style={{ width: '100%', padding: 8, marginBottom: 12, direction: 'rtl' }}
        />

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>אימות סיסמה</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          style={{ width: '100%', padding: 8, marginBottom: 16, direction: 'rtl' }}
        />

        {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, fontWeight: 500 }}>
          {loading ? 'שומר...' : 'עדכן סיסמה'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/login" style={{ fontSize: 12 }}>חזרה להתחברות</Link>
        </div>
      </form>
    </div>
  );
}
