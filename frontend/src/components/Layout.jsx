import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh' }}>
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          borderBottom: '1px solid #e0e0e0',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <strong>מ.ל.א — ניהול סדנאות</strong>
          <Link to="/profile">האזור האישי שלי</Link>
          {isAdmin && (
            <>
              <Link to="/admin/users">משתמשים</Link>
              <Link to="/admin/workshops">סדנאות</Link>
              <Link to="/admin/import">קליטת CSV</Link>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: 13 }}>{user?.full_name}</span>
          <button onClick={handleLogout}>התנתקות</button>
        </div>
      </nav>
      <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
