import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const { message } = await authApi.requestPasswordReset(email);
    setMessage(message);
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
        style={{ background: '#fff', padding: 32, borderRadius: 8, width: 300, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: 16 }}>שחזור סיסמה</h2>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>דוא"ל</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 12, direction: 'rtl' }}
        />
        {message && <p style={{ fontSize: 13, color: '#1e7e34', marginBottom: 12 }}>{message}</p>}
        <button type="submit" style={{ width: '100%', padding: 10, fontWeight: 500 }}>
          שליחת קישור לאיפוס
        </button>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/login" style={{ fontSize: 12 }}>
            חזרה להתחברות
          </Link>
        </div>
      </form>
    </div>
  );
}
