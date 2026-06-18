import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import * as usersApi from '../api/users';

const EMPTY_FORM = {
  full_name: '',
  national_id: '',
  birth_date: '',
  phone: '',
  email: '',
  address: '',
  gender: '',
  membership_expiry_date: '',
  notes: '',
  role: 'member',
};

export default function CreateUserPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.createUser({
        ...form,
        national_id: form.national_id || null,
        birth_date: form.birth_date || null,
        phone: form.phone || null,
        address: form.address || null,
        gender: form.gender || null,
        membership_expiry_date: form.membership_expiry_date || null,
        notes: form.notes || null,
      }),
    onSuccess: (user) => navigate(`/admin/users/${user.id}`),
    onError: (err) => setError(err.response?.data?.error || 'אירעה שגיאה ביצירת המשתמש'),
  });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    mutation.mutate();
  }

  return (
    <div>
      <button onClick={() => navigate('/admin/users')} style={{ marginBottom: 16 }}>
        ← חזרה לרשימת המשתמשים
      </button>

      <h2>הוספת משתמש חדש</h2>

      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="שם" value={form.full_name} onChange={(v) => set('full_name', v)} required />
          <Field label="תעודת זהות" value={form.national_id} onChange={(v) => set('national_id', v)} />

          <Field label="דוא&quot;ל" type="email" value={form.email} onChange={(v) => set('email', v)} required />
          <Field label="טלפון" value={form.phone} onChange={(v) => set('phone', v)} />

          <Field label="תאריך לידה" type="date" value={form.birth_date} onChange={(v) => set('birth_date', v)} />
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>מגדר</label>
            <select
              value={form.gender}
              onChange={(e) => set('gender', e.target.value)}
              style={{ width: '100%', padding: 8, direction: 'rtl' }}
            >
              <option value="">—</option>
              <option value="female">נקבה</option>
              <option value="male">זכר</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="כתובת מגורים" value={form.address} onChange={(v) => set('address', v)} />
          </div>

          <Field
            label="תוקף חברות בעמותה"
            type="date"
            value={form.membership_expiry_date}
            onChange={(v) => set('membership_expiry_date', v)}
          />
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>תפקיד מערכת</label>
            <select
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              style={{ width: '100%', padding: 8, direction: 'rtl' }}
            >
              <option value="member">חבר</option>
              <option value="admin">מנהל</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>הערות</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            style={{ width: '100%', padding: 8, direction: 'rtl', fontFamily: 'inherit' }}
          />
        </div>

        <p style={{ fontSize: 12, color: '#999', marginTop: 12 }}>
          לא נדרשת סיסמה כרגע — המשתמש יוכל להגדיר סיסמה בעצמו דרך "שכחתי סיסמה" במסך ההתחברות.
        </p>

        {error && <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>{error}</p>}

        <div style={{ marginTop: 16, textAlign: 'left' }}>
          <button type="submit" disabled={mutation.isPending} style={{ fontWeight: 500 }}>
            {mutation.isPending ? 'יוצר...' : 'יצירת משתמש'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>
        {label}
        {required && <span style={{ color: '#c0392b' }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={{ width: '100%', padding: 8, direction: 'rtl' }}
      />
    </div>
  );
}
