import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as usersApi from '../api/users';
import StatusBadge from '../components/StatusBadge';

export default function UsersGridPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('assist_count');
  const [sortDir, setSortDir] = useState('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, status, page, pageSize, sortBy, sortDir],
    queryFn: () => usersApi.listUsers({ search, status, page, pageSize, sortBy, sortDir }),
  });

  async function handleExport() {
    const blob = await usersApi.exportUsersCsv({ search, status });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSort(col) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>
          משתמשים{' '}
          <span style={{ fontSize: 13, color: '#888', background: '#f1f1f1', padding: '2px 8px', borderRadius: 6 }}>
            {total}
          </span>
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder='חיפוש לפי שם, טלפון או דוא"ל'
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 240, padding: 8, direction: 'rtl' }}
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ padding: 8, direction: 'rtl' }}
          >
            <option value="">כל הסטטוסים</option>
            <option value="כן">חבר עמותה</option>
            <option value="זכאי">זכאי</option>
            <option value="פג">פג תוקף</option>
            <option value="לא">לא</option>
          </select>
          <button onClick={handleExport}>ייצוא</button>
          <Link to="/admin/users/new">
            <button style={{ fontWeight: 500 }}>+ הוספת משתמש</button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p>טוען...</p>
      ) : (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f6f8' }}>
                <SortTh col="full_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>שם</SortTh>
                <SortTh col="membership_status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>חבר עמותה</SortTh>
                <Th>טלפון</Th>
                <Th>דוא"ל</Th>
                <Th>כתובת מגורים</Th>
                <Th>מגדר</Th>
                <Th>תאריך לידה</Th>
                <SortTh col="student_workshop" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>סדנת סטודנט</SortTh>
                <SortTh col="assist_count" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>כמות סדנאות</SortTh>
                <SortTh col="last_workshop" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>סדנה אחרונה</SortTh>
                <SortTh col="staff_count" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>סדנאות בתפקיד</SortTh>
                <SortTh col="age" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>גיל</SortTh>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                  <Td>
                    <Link to={`/admin/users/${u.id}`}>{u.full_name}</Link>
                    {u.deletion_requested_at && (
                      <span
                        title={`בקשת מחיקה מ-${new Date(u.deletion_requested_at).toLocaleDateString('he-IL')}`}
                        style={{ marginRight: 6, fontSize: 13 }}
                      >🗑️</span>
                    )}
                  </Td>
                  <Td><StatusBadge value={u.membership_status} /></Td>
                  <Td>{u.phone || '—'}</Td>
                  <Td>{u.email}</Td>
                  <Td>{u.address || '—'}</Td>
                  <Td>{u.gender === 'female' ? 'נקבה' : u.gender === 'male' ? 'זכר' : '—'}</Td>
                  <Td>{u.birth_date ? new Date(u.birth_date).toLocaleDateString('he-IL') : '—'}</Td>
                  <Td>{u.student_workshop ?? '—'}</Td>
                  <Td>{u.assist_count}</Td>
                  <Td>{u.last_workshop ?? '—'}</Td>
                  <Td>{u.staff_count || '—'}</Td>
                  <Td>{u.age ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 13, color: '#666' }}>
        <span>
          {total > 0 ? `מציג ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} מתוך ${total}` : ''}
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            שורות בעמוד:
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{ padding: '4px 6px', direction: 'rtl' }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>הקודם</button>
            <span>עמוד {page} מתוך {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>הבא</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortTh({ col, sortBy, sortDir, onSort, children }) {
  const active = sortBy === col;
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        textAlign: 'right',
        padding: '10px 14px',
        fontWeight: 500,
        color: active ? '#2E75B6' : '#555',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children} {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </th>
  );
}

function Th({ children }) {
  return <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 500, color: '#555' }}>{children}</th>;
}
function Td({ children }) {
  return <td style={{ padding: '10px 14px' }}>{children}</td>;
}
