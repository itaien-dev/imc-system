import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as accessLogApi from '../api/accessLog';

const ACTION_LABELS = {
  view: 'צפייה',
  update: 'עדכון',
  delete: 'מחיקה',
  export: 'ייצוא',
  create: 'יצירה',
  import: 'ייבוא',
};

const ACTION_COLORS = {
  view: '#1a56b0',
  update: '#b45309',
  delete: '#c0392b',
  export: '#5b5b5b',
  create: '#1e7e34',
  import: '#6f42c1',
};

const FIELD_LABELS = {
  full_name: 'שם',
  national_id: 'ת.ז',
  birth_date: 'תאריך לידה',
  phone: 'טלפון',
  email: 'דוא"ל',
  address: 'כתובת',
  gender: 'מגדר',
  membership_expiry_date: 'תוקף חברות',
  notes: 'הערות',
  role: 'תפקיד מערכת',
};

export default function AccessLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['access-log', page, action],
    queryFn: () => accessLogApi.listAccessLog({ page, pageSize, action }),
  });

  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>
          לוג גישה{' '}
          <span style={{ fontSize: 13, color: '#888', background: '#f1f1f1', padding: '2px 8px', borderRadius: 6 }}>
            {total}
          </span>
        </h2>
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          style={{ padding: 8, direction: 'rtl' }}
        >
          <option value="">כל הפעולות</option>
          <option value="view">צפייה</option>
          <option value="create">יצירה</option>
          <option value="update">עדכון</option>
          <option value="delete">מחיקה</option>
          <option value="export">ייצוא</option>
          <option value="import">ייבוא</option>
        </select>
      </div>

      {isLoading ? (
        <p>טוען...</p>
      ) : (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f6f8' }}>
                <Th>תאריך ושעה</Th>
                <Th>פעולה</Th>
                <Th>מבצע</Th>
                <Th>אובייקט</Th>
                <Th>תיאור / שינויים</Th>
                <Th>IP</Th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid #e0e0e0', verticalAlign: 'top' }}>
                  <Td style={{ whiteSpace: 'nowrap', color: '#666' }}>
                    {new Date(row.created_at).toLocaleString('he-IL')}
                  </Td>
                  <Td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      color: ACTION_COLORS[row.action] || '#333',
                      background: ACTION_COLORS[row.action] + '18',
                    }}>
                      {ACTION_LABELS[row.action] || row.action}
                    </span>
                  </Td>
                  <Td>
                    {row.actor_id
                      ? <Link to={`/admin/users/${row.actor_id}`}>{row.actor_name}</Link>
                      : '—'}
                  </Td>
                  <Td>
                    {row.target_id && <Link to={`/admin/users/${row.target_id}`}>{row.target_name}</Link>}
                    {row.target_id && row.target_workshop_id && <br />}
                    {row.target_workshop_id && <Link to={`/admin/workshops/${row.target_workshop_id}`}>סדנה #{row.target_workshop_id}</Link>}
                    {!row.target_id && !row.target_workshop_id && '—'}
                  </Td>
                  <Td>
                    {row.description && <div style={{ fontSize: 12, color: '#555', marginBottom: row.changes ? 6 : 0 }}>{row.description}</div>}
                    <ChangesCell changes={row.changes} />
                  </Td>
                  <Td style={{ color: '#999', fontSize: 12 }}>{row.ip_address || '—'}</Td>
                </tr>
              ))}
              {data?.rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                    אין רשומות
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 13, color: '#666' }}>
        <span>
          {total > 0 ? `מציג ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} מתוך ${total}` : ''}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>הקודם</button>
          <span>עמוד {page} מתוך {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>הבא</button>
        </div>
      </div>
    </div>
  );
}

function formatChangeValue(val) {
  if (val === null || val === undefined || val === '') return '—';
  // ISO date string (date only or with time)
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d)) return d.toLocaleDateString('he-IL');
  }
  return String(val);
}

function ChangesCell({ changes }) {
  if (!changes || typeof changes !== 'object' || Object.keys(changes).length === 0) return <span style={{ color: '#ccc' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => (
        <div key={field} style={{ fontSize: 12 }}>
          <span style={{ color: '#888', marginLeft: 4 }}>{FIELD_LABELS[field] || field}:</span>
          <span style={{ color: '#c0392b', textDecoration: 'line-through', marginLeft: 4 }}>{formatChangeValue(oldVal)}</span>
          <span style={{ color: '#555' }}>← </span>
          <span style={{ color: '#1e7e34' }}>{formatChangeValue(newVal)}</span>
        </div>
      ))}
    </div>
  );
}

function Th({ children }) {
  return <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 500, color: '#555' }}>{children}</th>;
}

function Td({ children, style }) {
  return <td style={{ padding: '10px 14px', ...style }}>{children}</td>;
}
