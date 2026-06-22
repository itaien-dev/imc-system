import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
    setMenuOpen(false);
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh', position: 'relative' }}>
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          borderBottom: '1px solid #e0e0e0',
          background: '#fff',
          position: 'relative',
        }}
      >
        <div className="nav-links">
          <strong>מ.ל.א — ניהול סדנאות</strong>
          <Link to="/profile">האזור האישי שלי</Link>
          {isAdmin && (
            <>
              <Link to="/admin/users">משתמשים</Link>
              <Link to="/admin/workshops">סדנאות</Link>
              <Link to="/admin/import">קליטת CSV</Link>
              <Link to="/admin/access-log">לוג גישה</Link>
            </>
          )}
        </div>

        {/* Mobile: title + hamburger */}
        <strong style={{ display: 'none' }} className="mobile-title">מ.ל.א</strong>
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="תפריט"
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: 13 }} className="nav-username">{user?.full_name}</span>
          <button onClick={handleLogout} className="nav-logout-desktop">התנתקות</button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <div className={`nav-mobile-menu${menuOpen ? ' open' : ''}`}>
        <Link to="/profile" onClick={() => setMenuOpen(false)}>האזור האישי שלי</Link>
        {isAdmin && (
          <>
            <Link to="/admin/users" onClick={() => setMenuOpen(false)}>משתמשים</Link>
            <Link to="/admin/workshops" onClick={() => setMenuOpen(false)}>סדנאות</Link>
            <Link to="/admin/import" onClick={() => setMenuOpen(false)}>קליטת CSV</Link>
            <Link to="/admin/access-log" onClick={() => setMenuOpen(false)}>לוג גישה</Link>
          </>
        )}
        <button onClick={handleLogout} style={{ color: '#c0392b' }}>התנתקות</button>
      </div>

      <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
