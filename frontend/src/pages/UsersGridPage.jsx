import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as usersApi from '../api/users';
import StatusBadge from '../components/StatusBadge';

export default function UsersGridPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, status, page],
    queryFn: () => usersApi.listUsers({ search, status, page, pageSize }),
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 240, padding: 8, direction: 'rtl' }}
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={{ padding: 8, direction: 'rtl' }}
          >
            <option value="">כל הסטטוסים</option>
            <option value="כן">חבר עמותה</option>
            <option value="זכאי">זכאי</option>
            <option value="פג">פג תוקף</option>
            <option value="לא">לא</option>
          </select>
          <button onClick={handleExport}>ייצוא</button>
        </div>
      </div>

      {isLoading ? (
        <p>טוען...</p>
      ) : (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f6f8' }}>
                <Th>שם</Th>
                <Th>חבר עמותה</Th>
                <Th>טלפון</Th>
                <Th>דוא"ל</Th>
                <Th>סדנת סטודנט</Th>
                <Th>כמות סדנאות</Th>
                <Th>סדנה אחרונה</Th>
                <Th>גיל</Th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                  <Td>
                    <Link to={`/admin/users/${u.id}`}>{u.full_name}</Link>
                  </Td>
                  <Td>
                    <StatusBadge value={u.membership_status} />
                  </Td>
                  <Td>{u.phone || '—'}</Td>
                  <Td>{u.email}</Td>
                  <Td>{u.student_workshop ?? '—'}</Td>
                  <Td>{u.assist_count}</Td>
                  <Td>{u.last_workshop ?? '—'}</Td>
                  <Td>{u.age ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13, color: '#666' }}>
        <span>
          מציג {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} מתוך {total}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            הקודם
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            הבא
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }) {
  return <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 500, color: '#555' }}>{children}</th>;
}
function Td({ children }) {
  return <td style={{ padding: '10px 14px' }}>{children}</td>;
}
