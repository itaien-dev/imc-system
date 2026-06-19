import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../api/users';
import StatusBadge from '../components/StatusBadge';
import AssignStaffRoleModal from '../components/AssignStaffRoleModal';
import WorkshopHistoryTable from '../components/WorkshopHistoryTable';
import { STAFF_ROLES } from '../components/staffRoles';

export default function UserCardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: ['user', id], queryFn: () => usersApi.getUser(id) });
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['user-history', id],
    queryFn: () => usersApi.getUserWorkshopHistory(id),
  });
  const [form, setForm] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [recruiterSearch, setRecruiterSearch] = useState('');
  const [recruiterSuggestions, setRecruiterSuggestions] = useState([]);

  const mutation = useMutation({
    mutationFn: (patch) => usersApi.updateUser(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setForm(null);
    },
  });

  if (isLoading || !user) return <p>טוען...</p>;
  const current = form || user;

  function set(field, value) {
    setForm({ ...(form || user), [field]: value });
  }

  function handleSave() {
    mutation.mutate({
      full_name:              current.full_name,
      national_id:            current.national_id,
      birth_date:             current.birth_date?.slice(0, 10) || null,
      phone:                  current.phone,
      email:                  current.email,
      address:                current.address,
      gender:                 current.gender,
      membership_expiry_date: current.membership_expiry_date?.slice(0, 10) || null,
      notes:                  current.notes,
      role:                   current.role,
      recruiter_email:        current.recruiter_email || null,
    });
  }

  async function handleRecruiterInput(val) {
    setRecruiterSearch(val);
    if (val.length < 2) { setRecruiterSuggestions([]); return; }
    const results = await usersApi.searchUsers(val);
    setRecruiterSuggestions(results.slice(0, 6));
  }

  function selectRecruiter(r) {
    set('recruiter_email', r.email);
    set('recruiter_name', r.full_name);
    setRecruiterSearch('');
    setRecruiterSuggestions([]);
  }

  function clearRecruiter() {
    set('recruiter_email', null);
    set('recruiter_name', null);
  }

  return (
    <div>
      <button onClick={() => navigate('/admin/users')} style={{ marginBottom: 16 }}>
        ← חזרה לרשימה
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{user.full_name}</h2>
        <StatusBadge value={user.membership_status} />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="שם" value={current.full_name} onChange={(v) => set('full_name', v)} />
          <Field label="תעודת זהות" value={current.national_id} onChange={(v) => set('national_id', v)} />
          <Field label="תאריך לידה" type="date" value={current.birth_date?.slice(0, 10)} onChange={(v) => set('birth_date', v)} />
          <Field label="טלפון" value={current.phone} onChange={(v) => set('phone', v)} />
          <Field label='דוא"ל' value={current.email} onChange={(v) => set('email', v)} />
          <Field label="כתובת" value={current.address} onChange={(v) => set('address', v)} />
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>מגדר</label>
            <select value={current.gender || ''} onChange={(e) => set('gender', e.target.value)}
              style={{ width: '100%', padding: 8, direction: 'rtl' }}>
              <option value="">—</option>
              <option value="female">נקבה</option>
              <option value="male">זכר</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>תפקיד מערכת</label>
            <select value={current.role || 'member'} onChange={(e) => set('role', e.target.value)}
              style={{ width: '100%', padding: 8, direction: 'rtl' }}>
              <option value="member">חבר</option>
              <option value="admin">מנהל</option>
            </select>
          </div>
          <Field label="תוקף חברות בעמותה" type="date"
            value={current.membership_expiry_date?.slice(0, 10)}
            onChange={(v) => set('membership_expiry_date', v)} />

          {/* Recruiter field */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>מגייס</label>
            {current.recruiter_name && !recruiterSearch ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, padding: 8, background: '#f5f6f8', borderRadius: 4, fontSize: 14, direction: 'rtl' }}>
                  {current.recruiter_name}
                </span>
                <button onClick={clearRecruiter}
                  style={{ padding: '6px 10px', fontSize: 12, color: '#888', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', background: '#fff' }}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="חפש לפי שם..."
                  value={recruiterSearch}
                  onChange={(e) => handleRecruiterInput(e.target.value)}
                  style={{ width: '100%', padding: 8, direction: 'rtl' }}
                />
                {recruiterSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#fff',
                    border: '1px solid #ddd', borderRadius: 4, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    {recruiterSuggestions.map((r) => (
                      <div key={r.id} onClick={() => selectRecruiter(r)}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, direction: 'rtl',
                          borderBottom: '1px solid #f0f0f0' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f6f8'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                        {r.full_name} <span style={{ color: '#888', fontSize: 11 }}>{r.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>הערות (מנהל)</label>
          <textarea value={current.notes || ''} onChange={(e) => set('notes', e.target.value)}
            rows={3} style={{ width: '100%', padding: 8, direction: 'rtl', fontFamily: 'inherit' }} />
        </div>

        <div style={{ marginTop: 16, textAlign: 'left' }}>
          <button onClick={handleSave} disabled={mutation.isPending} style={{ fontWeight: 500 }}>
            שמירת שינויים
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>נתונים מחושבים</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, fontSize: 13 }}>
          <Stat label="גיל" value={user.age ?? '—'} />
          <Stat label="כמות סדנאות (אסיסט)" value={user.assist_count} />
          <Stat label="סדנת סטודנט" value={user.student_workshop ?? '—'} />
          <Stat label="סדנה אחרונה" value={user.last_workshop ?? '—'} />
          <Stat label="סדנאות בתפקיד" value={user.staff_count || '—'} />
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>סדנאות בהן היה אסיסטנט</h3>
        </div>
        {loadingHistory ? <p style={{ fontSize: 13, color: '#888' }}>טוען...</p> : (
          <WorkshopHistoryTable
            rows={history?.filter((h) => h.role === 'assistant') ?? []}
            emptyText="לא היה אסיסטנט בשום סדנה"
            linkToWorkshop />
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>תפקידי צוות (רכז / DJ / מנחה / מתרגם / מלווה)</h3>
          <button onClick={() => setShowAssignModal(true)} style={{ fontWeight: 500, fontSize: 13 }}>
            + שיוך לתפקיד צוות
          </button>
        </div>
        {loadingHistory ? <p style={{ fontSize: 13, color: '#888' }}>טוען...</p> : (
          <WorkshopHistoryTable
            rows={history?.filter((h) => STAFF_ROLES.includes(h.role)) ?? []}
            emptyText="לא משויך לתפקיד צוות בשום סדנה"
            showRole linkToWorkshop />
        )}
      </div>

      {showAssignModal && (
        <AssignStaffRoleModal userId={Number(id)} onClose={() => setShowAssignModal(false)} />
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: 8, direction: 'rtl' }} />
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
