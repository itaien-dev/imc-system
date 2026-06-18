import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as workshopsApi from '../api/workshops';
import StatusBadge from '../components/StatusBadge';

const TRACK_LABELS = { adults: 'בוגרים', youth: 'נוער', general: 'כללי' };

export default function WorkshopCardPage() {
  const { id } = useParams();
  const workshopId = Number(id);
  const [tab, setTab] = useState('student');

  const { data: workshop, isLoading: loadingWorkshop } = useQuery({
    queryKey: ['workshop', workshopId],
    queryFn: () => workshopsApi.getWorkshop(workshopId),
  });

  const { data: participants, isLoading: loadingParticipants } = useQuery({
    queryKey: ['participants', workshopId, tab],
    queryFn: () => workshopsApi.getParticipants(workshopId, tab),
  });

  async function handleExport() {
    const blob = await workshopsApi.exportParticipantsCsv(workshopId, tab);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workshop_${workshopId}_${tab}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  if (loadingWorkshop || !workshop) return <p>טוען...</p>;

  return (
    <div>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 500 }}>
                סדנת {TRACK_LABELS[workshop.track] || workshop.track} #{workshop.workshop_number}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>
              {new Date(workshop.start_date).toLocaleDateString('he-IL')} –{' '}
              {new Date(workshop.end_date).toLocaleDateString('he-IL')} · סבב {workshop.cycle_number}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/admin/workshops/${workshopId}/close`}>
              <button>סגירת סדנה</button>
            </Link>
            <button onClick={handleExport}>ייצוא נרשמים</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
          <Stat label="סטודנטים" value={`${workshop.student_count} / 19`} />
          <Stat label="אסיסטנטים" value={`${workshop.assistant_count} / 40`} />
          <Stat label="תאריך משוב" value={workshop.feedback_date ? new Date(workshop.feedback_date).toLocaleDateString('he-IL') : '—'} />
          <Stat
            label="תאריכי פרסום"
            value={`${new Date(workshop.publish_start_date).toLocaleDateString('he-IL')}–${new Date(
              workshop.publish_end_date
            ).toLocaleDateString('he-IL')}`}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <TabButton active={tab === 'student'} onClick={() => setTab('student')}>
          סטודנטים
        </TabButton>
        <TabButton active={tab === 'assistant'} onClick={() => setTab('assistant')}>
          אסיסטנטים
        </TabButton>
        <TabButton active={tab === 'staff'} onClick={() => setTab('staff')}>
          צוות
        </TabButton>
      </div>

      {loadingParticipants ? (
        <p>טוען...</p>
      ) : (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f6f8' }}>
                <Th>שם</Th>
                {tab === 'assistant' && <Th>קריטריון קבלה</Th>}
                <Th>תאריך רישום</Th>
                {tab === 'assistant' && <Th>לפני כמה סבבים השתתף</Th>}
                {tab === 'staff' && <Th>תפקיד</Th>}
              </tr>
            </thead>
            <tbody>
              {participants?.map((p) => (
                <tr key={p.link_id} style={{ borderTop: '1px solid #e0e0e0' }}>
                  <Td>{p.full_name}</Td>
                  {tab === 'assistant' && (
                    <Td>
                      <StatusBadge value={p.acceptance_criterion} />
                    </Td>
                  )}
                  <Td>{new Date(p.registered_at).toLocaleDateString('he-IL')}</Td>
                  {tab === 'assistant' && <Td>{p.rounds_since_last ?? '—'}</Td>}
                  {tab === 'staff' && <Td>{p.role}</Td>}
                </tr>
              ))}
              {participants?.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#999' }}>
                    אין נרשמים בקטגוריה זו
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: '#f5f6f8', borderRadius: 6, padding: '10px 12px' }}>
      <p style={{ margin: 0, color: '#666', fontSize: 12 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontWeight: 500, fontSize: 16 }}>{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active ? '1px solid #ccc' : '1px solid transparent',
        background: active ? '#fff' : 'transparent',
        fontWeight: active ? 500 : 400,
      }}
    >
      {children}
    </button>
  );
}
