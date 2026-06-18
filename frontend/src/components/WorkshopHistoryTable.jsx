import { Link } from 'react-router-dom';

const TRACK_LABELS = { adults: 'בוגרים', youth: 'נוער', general: 'כללי' };
const ROLE_LABELS = {
  student: 'סטודנט',
  assistant: 'אסיסטנט',
  coordinator: 'רכז',
  dj: 'DJ',
  facilitator: 'מנחה',
  translator: 'מתרגם',
  chaperone: 'מלווה',
};

/**
 * Renders a table of workshop participation rows (as returned by GET /users/:id/history
 * or /users/me/history). Used both on the admin user card and the self-service profile page.
 *
 * `linkToWorkshop`: when true, the workshop number links to /admin/workshops/:id (admin only —
 * pass false for the self-service profile, since regular members can't access that route).
 */
export default function WorkshopHistoryTable({ rows, emptyText, showRole = false, linkToWorkshop = false }) {
  if (rows.length === 0) {
    return <p style={{ fontSize: 13, color: '#999' }}>{emptyText}</p>;
  }
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 6, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f5f6f8' }}>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: '#555' }}>סדנה</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: '#555' }}>שיוך</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: '#555' }}>תאריכים</th>
            {showRole && <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: '#555' }}>תפקיד</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.link_id} style={{ borderTop: '1px solid #e0e0e0' }}>
              <td style={{ padding: '8px 12px' }}>
                {linkToWorkshop ? <Link to={`/admin/workshops/${r.workshop_id}`}>#{r.workshop_number}</Link> : `#${r.workshop_number}`}
              </td>
              <td style={{ padding: '8px 12px' }}>{TRACK_LABELS[r.track] || r.track}</td>
              <td style={{ padding: '8px 12px' }}>
                <span dir="ltr">
                  {new Date(r.start_date).toLocaleDateString('he-IL')}–{new Date(r.end_date).toLocaleDateString('he-IL')}
                </span>
              </td>
              {showRole && <td style={{ padding: '8px 12px' }}>{ROLE_LABELS[r.role] || r.role}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
