import { useState } from 'react';
import * as importApi from '../api/import';

export default function ImportCsvPage() {
  const [entity, setEntity] = useState('users');
  const [rows, setRows] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const previewRows = entity === 'users' ? await importApi.previewUsersCsv(file) : await importApi.previewWorkshopsCsv(file);
      setRows(previewRows);
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    setLoading(true);
    try {
      const importableRows = rows.filter((r) => r.action !== 'skip');
      const commitResult =
        entity === 'users' ? await importApi.commitUsersCsv(importableRows) : await importApi.commitWorkshopsCsv(importableRows);
      setResult(commitResult);
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  const warningCount = rows ? rows.filter((r) => r.warnings.length > 0).length : 0;

  return (
    <div>
      <h2>קליטת נתונים מ-CSV</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => {
            setEntity('users');
            setRows(null);
            setResult(null);
          }}
          style={{ fontWeight: entity === 'users' ? 500 : 400, border: entity === 'users' ? '1px solid #ccc' : '1px solid transparent' }}
        >
          משתמשים
        </button>
        <button
          onClick={() => {
            setEntity('workshops');
            setRows(null);
            setResult(null);
          }}
          style={{
            fontWeight: entity === 'workshops' ? 500 : 400,
            border: entity === 'workshops' ? '1px solid #ccc' : '1px solid transparent',
          }}
        >
          סדנאות
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
        <div
          style={{
            border: '2px dashed #ccc',
            borderRadius: 6,
            padding: '24px',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <input type="file" accept=".csv" onChange={handleFileChange} />
          <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>קובץ CSV בפורמט UTF-8</p>
        </div>

        {loading && <p>מעבד...</p>}

        {result && (
          <p style={{ color: '#1e7e34' }}>
            ייבוא הושלם: {result.created} רשומות חדשות נוצרו, {result.updated} עודכנו.
          </p>
        )}

        {rows && (
          <>
            <p style={{ fontSize: 13, color: '#666' }}>
              תצוגה מקדימה ({rows.length} שורות{warningCount > 0 ? `, ${warningCount} עם אזהרות` : ''})
            </p>
            <div style={{ border: '1px solid #e0e0e0', borderRadius: 6, marginBottom: 16, maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f6f8' }}>
                    {entity === 'users' ? (
                      <>
                        <Th>שם</Th>
                        <Th>טלפון</Th>
                        <Th>דוא"ל</Th>
                        <Th>פעולה</Th>
                        <Th>אזהרות</Th>
                      </>
                    ) : (
                      <>
                        <Th>מספר סדנה</Th>
                        <Th>שיוך</Th>
                        <Th>תאריך התחלה</Th>
                        <Th>פעולה</Th>
                        <Th>אזהרות</Th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.rowNumber}
                      style={{ borderTop: '1px solid #e0e0e0', background: r.warnings.length > 0 ? '#fff8e6' : 'transparent' }}
                    >
                      {entity === 'users' ? (
                        <>
                          <Td>{r.full_name}</Td>
                          <Td>{r.phone || '—'}</Td>
                          <Td>{r.email || '—'}</Td>
                          <Td>{actionLabel(r.action)}</Td>
                        </>
                      ) : (
                        <>
                          <Td>{r.workshop_number || '—'}</Td>
                          <Td>{r.track}</Td>
                          <Td>{r.start_date || '—'}</Td>
                          <Td>{actionLabel(r.action)}</Td>
                        </>
                      )}
                      <Td>{r.warnings.join('; ')}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={handleCommit} disabled={loading} style={{ width: '100%', fontWeight: 500 }}>
              אישור וייבוא
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function actionLabel(action) {
  if (action === 'create') return 'יצירה';
  if (action === 'update') return 'עדכון';
  return 'דילוג';
}

function Th({ children }) {
  return <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 500 }}>{children}</th>;
}
function Td({ children }) {
  return <td style={{ padding: '6px 10px' }}>{children}</td>;
}
