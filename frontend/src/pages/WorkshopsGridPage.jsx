import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as workshopsApi from '../api/workshops';

const TRACK_LABELS = { adults: 'בוגרים', youth: 'נוער', general: 'כללי' };

export default function WorkshopsGridPage() {
  const { data, isLoading } = useQuery({ queryKey: ['workshops'], queryFn: () => workshopsApi.listWorkshops() });

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>סדנאות</h2>
      {isLoading ? (
        <p>טוען...</p>
      ) : (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f6f8' }}>
                <Th>מספר סדנה</Th>
                <Th>שיוך</Th>
                <Th>תאריך התחלה</Th>
                <Th>תאריך סיום</Th>
                <Th>סבב</Th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }) {
  return <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 500, color: '#555' }}>{children}</th>;
}
function Td({ children }) {
  return <td style={{ padding: '10px 14px' }}>{children}</td>;
}
