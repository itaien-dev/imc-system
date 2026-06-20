import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as workshopsApi from '../api/workshops';
import StatusBadge from '../components/StatusBadge';
import AddParticipantModal from '../components/AddParticipantModal';
import { STAFF_ROLE_LABELS } from '../components/staffRoles';

const TRACK_LABELS = { adults: 'בוגרים', youth: 'נוער', general: 'כללי' };

export default function WorkshopCardPage() {
  const { id } = useParams();
  const workshopId = Number(id);
  const [tab, setTab] = useState('student');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (payload) => workshopsApi.updateWorkshop(workshopId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop', workshopId] });
      setEditMode(false);
      setForm(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (linkId) => workshopsApi.removeParticipant(workshopId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', workshopId, tab] });
      queryClient.invalidateQueries({ queryKey: ['workshop', workshopId] });
    },
  });

  function handleRemove(linkId, name) {
    if (!window.confirm(`למחוק את ${name} מהסדנה?`)) return;
    removeMutation.mutate(linkId);
  }

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
              <span dir="ltr">
                {new Date(workshop.start_date).toLocaleDateString('he-IL')} –{' '}
                {new Date(workshop.end_date).toLocaleDateString('he-IL')}
              </span>{' '}
              · סבב {workshop.cycle_number}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setForm({ ...workshop, start_date: workshop.start_date?.slice(0,10), end_date: workshop.end_date?.slice(0,10), publish_start_date: workshop.publish_start_date?.slice(0,10), publish_end_date: workshop.publish_end_date?.slice(0,10), feedback_date: workshop.feedback_date?.slice(0,10) || '' }); setEditMode(true); }}>עריכה</button>
            <Link to={`/admin/workshops/${workshopId}/close`}>
              <button>סגירת סדנה</button>
            </Link>
            <button onClick={handleExport}>ייצוא נרשמים</button>
          </div>
        </div>

        {editMode && form ? (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <WField label="מספר סדנה" type="number" value={form.workshop_number} onChange={v => setForm({...form, workshop_number: Number(v)})} />
            <WField label="סבב" type="number" value={form.cycle_number} onChange={v => setForm({...form, cycle_number: Number(v)})} />
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>שיוך</label>
              <select value={form.track} onChange={e => setForm({...form, track: e.target.value})} style={{ width: '100%', padding: 8, direction: 'rtl' }}>
                <option value="adults">בוגרים</option>
                <option value="youth">נוער</option>
                <option value="general">כללי</option>
              </select>
            </div>
            <WField label="תאריך משוב" type="date" value={form.feedback_date} onChange={v => setForm({...form, feedback_date: v})} />
            <WField label="תאריך התחלה" type="date" value={form.start_date} onChange={v => setForm({...form, start_date: v})} />
            <WField label="תאריך סיום" type="date" value={form.end_date} onChange={v => setForm({...form, end_date: v})} />
            <WField label="פרסום מ-" type="date" value={form.publish_start_date} onChange={v => setForm({...form, publish_start_date: v})} />
            <WField label="פרסום עד-" type="date" value={form.publish_end_date} onChange={v => setForm({...form, publish_end_date: v})} />
            <WField label='דוא"ל' value={form.email || ''} onChange={v => setForm({...form, email: v})} />
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>הערות</label>
              <textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} rows={2} style={{ width: '100%', padding: 8, direction: 'rtl', fontFamily: 'inherit' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setEditMode(false); setForm(null); }}>ביטול</button>
              <button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} style={{ fontWeight: 500 }}>שמירה</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
            <Stat label="סטודנטים" value={`${workshop.student_count} / 19`} />
            <Stat label="אסיסטנטים" value={`${workshop.assistant_count} / 40`} />
            <Stat label="תאריך משוב" value={workshop.feedback_date ? new Date(workshop.feedback_date).toLocaleDateString('he-IL') : '—'} />
            <Stat
              label="תאריכי פרסום"
              value={
                <span dir="ltr">
                  {new Date(workshop.publish_start_date).toLocaleDateString('he-IL')}–
                  {new Date(workshop.publish_end_date).toLocaleDateString('he-IL')}
                </span>
              }
            />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
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
        <button onClick={() => setShowAddModal(true)} style={{ fontWeight: 500 }}>
          + הוספת משתתף
        </button>
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
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {participants?.map((p) => (
                <tr key={p.link_id} style={{ borderTop: '1px solid #e0e0e0' }}>
                  <Td><Link to={`/admin/users/${p.user_id}`}>{p.full_name}</Link></Td>
                  {tab === 'assistant' && (
                    <Td>
                      <StatusBadge value={p.acceptance_criterion} />
                    </Td>
                  )}
                  <Td>{new Date(p.registered_at).toLocaleDateString('he-IL')}</Td>
                  {tab === 'assistant' && <Td>{p.rounds_since_last ?? '—'}</Td>}
                  {tab === 'staff' && <Td>{STAFF_ROLE_LABELS[p.role] || p.role}</Td>}
                  <Td>
                    <button
                      onClick={() => handleRemove(p.link_id, p.full_name)}
                      disabled={removeMutation.isPending}
                      style={{ color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                      title="מחיקה"
                    >
                      ✕
                    </button>
                  </Td>
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

      {showAddModal && (
        <AddParticipantModal workshopId={workshopId} tab={tab} onClose={() => setShowAddModal(false)} />
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

function WField({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: 8, direction: 'rtl' }} />
    </div>
  );
}

function Th({ children }) {
  return <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 500, color: '#555' }}>{children}</th>;
}

function Td({ children }) {
  return <td style={{ padding: '10px 14px' }}>{children}</td>;
}
