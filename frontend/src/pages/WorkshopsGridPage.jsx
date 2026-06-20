import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as workshopsApi from '../api/workshops';

const TRACK_LABELS = { adults: 'בוגרים', youth: 'נוער', general: 'כללי' };

export default function WorkshopsGridPage() {
  const [search, setSearch] = useState('');
  const [track, setTrack] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('cycle_number');
  const [sortDir, setSortDir] = useState('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['workshops', search, track, page, pageSize, sortBy, sortDir],
    queryFn: () => workshopsApi.listWorkshops({ search, track, page, pageSize, sortBy, sortDir }),
  });

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
          סדנאות{' '}
          <span style={{ fontSize: 13, color: '#888', background: '#f1f1f1', padding: '2px 8px', borderRadius: 6 }}>
            {total}
          </span>
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="חיפוש לפי מספר סדנה"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 200, padding: 8, direction: 'rtl' }}
          />
          <select
            value={track}
            onChange={(e) => { setTrack(e.target.value); setPage(1); }}
            style={{ padding: 8, direction: 'rtl' }}
          >
            <option value="">כל השיוכים</option>
            <option value="adults">בוגרים</option>
            <option value="youth">נוער</option>
            <option value="general">כללי</option>
          </select>
          <Link to="/admin/workshops/new">
            <button style={{ fontWeight: 500 }}>+ הוספת סדנה</button>
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
                <SortTh col="workshop_number" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>מספר סדנה</SortTh>
                <Th>שיוך</Th>
                <SortTh col="start_date" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>תאריך התחלה</SortTh>
                <SortTh col="end_date" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>תאריך סיום</SortTh>
                <SortTh col="cycle_number" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>סבב</SortTh>
                <Th>מנחים</Th>
                <Th>רכזים</Th>
                <Th>DJ</Th>
                <Th>מלווה</Th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((w) => (
                <tr key={w.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                  <Td>
                    <Link to={`/admin/workshops/${w.id}`}>#{w.workshop_number}</Link>
                  </Td>
                  <Td>{TRACK_LABELS[w.track] || w.track}</Td>
                  <Td>{new Date(w.start_date).toLocaleDateString('he-IL')}</Td>
                  <Td>{new Date(w.end_date).toLocaleDateString('he-IL')}</Td>
                  <Td>{w.cycle_number}</Td>
                  <Td>{w.facilitators || '—'}</Td>
                  <Td>{w.coordinators || '—'}</Td>
                  <Td>{w.djs || '—'}</Td>
                  <Td>{w.chaperones || '—'}</Td>
                </tr>
              ))}
              {data?.rows.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 16, textAlign: 'center', color: '#999' }}>
                    לא נמצאו סדנאות
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
