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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
          <div style={{ gridColumn: '1 / -1' }}>
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

        <div
          style={{
            borderTop: '1px solid #e0e0e0',
            marginTop: 16,
            paddingTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
            תאריך הוספה ותוקף חברות ניתנים לעדכון ע"י מנהל בלבד
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {savedMessage && <span style={{ color: '#1e7e34', fontSize: 13 }}>{savedMessage}</span>}
            <button onClick={handleSave} disabled={mutation.isPending} style={{ fontWeight: 500 }}>
              שמירת שינויים
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, marginTop: 12 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>שינוי סיסמה</h3>
        <form onSubmit={handleChangePassword}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 12 }}>
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
