import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as publicApi from '../api/public';

const TRACK_LABELS = { adults: 'בוגרים', youth: 'נוער', general: 'כללי' };

export default function PublicHomePage() {
  const { data: workshops, isLoading } = useQuery({
    queryKey: ['public-workshops'],
    queryFn: publicApi.getPublicWorkshops,
  });
  const [signupWorkshop, setSignupWorkshop] = useState(null);

  return (
    <div dir="rtl" style={{ fontFamily: 'Arial, sans-serif', maxWidth: 700, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center' }}>עמותת מ.ל.א</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>סדנת "זו בחירתי" — הרשמה לסדנאות פתוחות</p>

      {isLoading && <p>טוען...</p>}

      {workshops?.length === 0 && <p style={{ textAlign: 'center', color: '#999' }}>אין כרגע סדנאות פתוחות להרשמה.</p>}

      {workshops?.map((w) => (
        <div
          key={w.id}
          style={{
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 500 }}>
              סדנת {TRACK_LABELS[w.track] || w.track} #{w.workshop_number}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
              {new Date(w.start_date).toLocaleDateString('he-IL')} – {new Date(w.end_date).toLocaleDateString('he-IL')}
            </p>
          </div>
          <button onClick={() => setSignupWorkshop(w)}>הרשמה</button>
        </div>
      ))}

      {signupWorkshop && <SignupModal workshop={signupWorkshop} onClose={() => setSignupWorkshop(null)} />}
    </div>
  );
}

function SignupModal({ workshop, onClose }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', requested_role: 'student' });
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => publicApi.submitSignup(workshop.id, form),
    onSuccess: () => setDone(true),
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 320 }}>
        {done ? (
          <>
            <p style={{ color: '#1e7e34' }}>הרישום התקבל בהצלחה! ניצור איתך קשר בהמשך.</p>
            <button onClick={onClose} style={{ width: '100%' }}>
              סגירה
            </button>
          </>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>הרשמה לסדנה #{workshop.workshop_number}</h3>
            <Field label="שם מלא" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <Field label="דוא&quot;ל" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="טלפון" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>תפקיד מבוקש</label>
              <select
                value={form.requested_role}
                onChange={(e) => setForm({ ...form, requested_role: e.target.value })}
                style={{ width: '100%', padding: 8, direction: 'rtl' }}
              >
                <option value="student">סטודנט</option>
                <option value="assistant">אסיסטנט</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending} style={{ flex: 1, fontWeight: 500 }}>
                שליחה
              </button>
              <button onClick={onClose} style={{ flex: 1 }}>
                ביטול
              </button>
            </div>
            {mutation.isError && (
              <p style={{ color: '#c0392b', fontSize: 12, marginTop: 8 }}>
                {mutation.error?.response?.data?.error || 'אירעה שגיאה, נסו שוב'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: 8, direction: 'rtl' }}
      />
    </div>
  );
}
