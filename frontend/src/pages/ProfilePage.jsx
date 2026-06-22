import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../api/users';
import * as authApi from '../api/auth';
import StatusBadge from '../components/StatusBadge';
import WorkshopHistoryTable from '../components/WorkshopHistoryTable';
import { STAFF_ROLES } from '../components/staffRoles';

const EDITABLE_FIELDS = ['full_name', 'national_id', 'birth_date', 'phone', 'email', 'address', 'gender'];

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: usersApi.getMe });
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['my-history'],
    queryFn: usersApi.getMyWorkshopHistory,
  });
  const [form, setForm] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMessage, setPwMessage] = useState({ text: '', error: false });
  const [deletionMsg, setDeletionMsg] = useState('');

  const deletionMutation = useMutation({
    mutationFn: usersApi.requestDeletion,
    onSuccess: () => {
      setDeletionMsg('בקשת המחיקה שלך התקבלה ותטופל על ידי המנהל בהקדם.');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  function handleRequestDeletion() {
    if (!window.confirm('האם אתה בטוח שברצונך לבקש מחיקת החשבון? הבקשה תועבר למנהל המערכת לאישור.')) return;
    deletionMutation.mutate();
  }

  const mutation = useMutation({
    mutationFn: (patch) => usersApi.updateMe(patch),
    onSuccess: () => {
      setSavedMessage('השינויים נשמרו');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setTimeout(() => setSavedMessage(''), 2500);
    },
  });

  if (isLoading || !user) return <p>טוען...</p>;

  const current = form || user;

  function handleChange(field, value) {
    setForm({ ...current, [field]: value });
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwMessage({ text: 'הסיסמאות החדשות אינן תואמות', error: true });
      return;
    }
    try {
      await authApi.changePassword(pwForm.current, pwForm.next);
      setPwMessage({ text: 'הסיסמה עודכנה בהצלחה', error: false });
      setPwForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwMessage({ text: '', error: false }), 3000);
    } catch (err) {
      setPwMessage({ text: err.response?.data?.error || 'שגיאה בעדכון הסיסמה', error: true });
    }
  }

  function handleSave() {
    const patch = {};
    for (const field of EDITABLE_FIELDS) {
      if (current[field] !== user[field]) patch[field] = current[field];
    }
    mutation.mutate(patch);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#e7f0fb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 500,
            color: '#1a56b0',
          }}
        >
          {user.full_name?.slice(0, 2)}
        </div>
        <div>
          <p style={{ fontWeight: 500, margin: 0 }}>{user.full_name}</p>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>האזור האישי שלי</p>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
        <div className="grid-2">
          <Field label="שם" value={current.full_name} onChange={(v) => handleChange('full_name', v)} />
          <Field label="תעודת זהות" value={current.national_id} onChange={(v) => handleChange('national_id', v)} />
          <Field
            label="תאריך לידה"
            type="date"
            value={current.birth_date?.slice(0, 10)}
            onChange={(v) => handleChange('birth_date', v)}
          />
          <Field label="טלפון" value={current.phone} onChange={(v) => handleChange('phone', v)} />
          <Field label="דוא&quot;ל" value={current.email} onChange={(v) => handleChange('email', v)} />
          <div style={{ gridColumn: '1 / -1' }} className="grid-2-full">
            <Field label="כתובת מגורים" value={current.address} onChange={(v) => handleChange('address', v)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>מגדר</label>
            <select
              value={current.gender || ''}
              onChange={(e) => handleChange('gender', e.target.value)}
              style={{ width: '100%', padding: 8, direction: 'rtl' }}
            >
              <option value="">—</option>
              <option value="female">נקבה</option>
              <option value="male">זכר</option>
            </select>
          </div>
        </div>

        <div className="profile-footer" style={{ borderTop: '1px solid #e0e0e0', marginTop: 16, paddingTop: 12 }}>
          <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
            תאריך הוספה ותוקף חברות ניתנים לעדכון ע"י מנהל בלבד
          </p>
          <div className="profile-actions">
            {savedMessage && <span style={{ color: '#1e7e34', fontSize: 13 }}>{savedMessage}</span>}
            <button onClick={handleSave} disabled={mutation.isPending} style={{ fontWeight: 500 }}>
              שמירת שינויים
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, marginTop: 12 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>נתונים מחושבים</h3>
        <div className="grid-5">
          <Stat label="גיל" value={user.age ?? '—'} />
          <Stat label="כמות סדנאות (אסיסט)" value={user.assist_count} />
          <Stat label="סדנת סטודנט" value={user.student_workshop ?? '—'} />
          <Stat label="סדנה אחרונה" value={user.last_workshop ?? '—'} />
          <Stat label="סדנאות בתפקיד" value={user.staff_count || '—'} />
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, marginTop: 12 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>שינוי סיסמה</h3>
        <form onSubmit={handleChangePassword}>
          <div className="grid-3" style={{ marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>סיסמה נוכחית</label>
              <input type="password" value={pwForm.current} required
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                style={{ width: '100%', padding: 8, direction: 'rtl' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>סיסמה חדשה</label>
              <input type="password" value={pwForm.next} required minLength={8}
                onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                style={{ width: '100%', padding: 8, direction: 'rtl' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>אימות סיסמה חדשה</label>
              <input type="password" value={pwForm.confirm} required minLength={8}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                style={{ width: '100%', padding: 8, direction: 'rtl' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="submit" style={{ fontWeight: 500 }}>עדכן סיסמה</button>
            {pwMessage.text && (
              <span style={{ fontSize: 13, color: pwMessage.error ? '#c0392b' : '#1e7e34' }}>{pwMessage.text}</span>
            )}
          </div>
        </form>
      </div>

      <div
        style={{
          background: '#f5f6f8',
          borderRadius: 8,
          padding: '12px 16px',
          marginTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>חברות בעמותה</p>
          <p style={{ fontSize: 12, color: '#666', margin: '2px 0 0' }}>
            {user.membership_expiry_date
              ? `בתוקף עד ${new Date(user.membership_expiry_date).toLocaleDateString('he-IL')}`
              : 'אין תאריך תוקף רשום'}
          </p>
        </div>
        <StatusBadge value={user.membership_status} />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, marginTop: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>סדנאות בהן הייתי אסיסטנט</h3>
        {loadingHistory ? (
          <p style={{ fontSize: 13, color: '#888' }}>טוען...</p>
        ) : (
          <WorkshopHistoryTable
            rows={history?.filter((h) => h.role === 'assistant') ?? []}
            emptyText="לא הייתי אסיסטנט בשום סדנה"
          />
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, marginTop: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>תפקידי צוות (רכז / DJ / מנחה / מתרגם / מלווה)</h3>
        {loadingHistory ? (
          <p style={{ fontSize: 13, color: '#888' }}>טוען...</p>
        ) : (
          <WorkshopHistoryTable
            rows={history?.filter((h) => STAFF_ROLES.includes(h.role)) ?? []}
            emptyText="לא משויך לתפקיד צוות בשום סדנה"
            showRole
          />
        )}
      </div>

      <div style={{ borderTop: '1px solid #e0e0e0', marginTop: 24, paddingTop: 20 }}>
        {user.deletion_requested_at ? (
          <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#856404' }}>
            ⏳ בקשת מחיקת החשבון שלך התקבלה ב-{new Date(user.deletion_requested_at).toLocaleDateString('he-IL')} וממתינה לאישור המנהל.
          </div>
        ) : (
          <div className="deletion-row">
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#555' }}>מחיקת חשבון</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#999' }}>הבקשה תועבר למנהל המערכת לאישור. החשבון לא יימחק באופן מיידי.</p>
            </div>
            <button
              onClick={handleRequestDeletion}
              disabled={deletionMutation.isPending}
              style={{ color: '#c0392b', border: '1px solid #c0392b', background: '#fff', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
            >
              בקשת מחיקת חשבון
            </button>
          </div>
        )}
        {deletionMsg && <p style={{ fontSize: 13, color: '#856404', marginTop: 8 }}>{deletionMsg}</p>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: 8, direction: 'rtl' }}
      />
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
