import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../api/users';
import StatusBadge from '../components/StatusBadge';

export default function UserCardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: ['user', id], queryFn: () => usersApi.getUser(id) });
  const [form, setForm] = useState(null);

  const mutation = useMutation({
    mutationFn: (patch) => usersApi.updateUser(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  if (isLoading || !user) return <p>טוען...</p>;
  const current = form || user;

  function set(field, value) {
    setForm({ ...current, [field]: value });
  }

  function handleSave() {
    mutation.mutate({
      full_name: current.full_name,
      phone: current.phone,
      email: current.email,
      address: current.address,
      gender: current.gender,
      membership_expiry_date: current.membership_expiry_date?.slice(0, 10) || null,
      notes: current.notes,
      role: current.role,
    });
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
          <Field label="טלפון" value={current.phone} onChange={(v) => set('phone', v)} />
          <Field label="דוא&quot;ל" value={current.email} onChange={(v) => set('email', v)} />
          <Field label="כתובת" value={current.address} onChange={(v) => set('address', v)} />
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>מגדר</label>
            <select
              value={current.gender || ''}
              onChange={(e) => set('gender', e.target.value)}
              style={{ width: '100%', padding: 8, direction: 'rtl' }}
            >
              <option value="">—</option>
              <option value="female">נקבה</option>
              <option value="male">זכר</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>תפקיד מערכת</label>
            <select
              value={current.role || 'member'}
              onChange={(e) => set('role', e.target.value)}
              style={{ width: '100%', padding: 8, direction: 'rtl' }}
            >
              <option value="member">חבר</option>
              <option value="admin">מנהל</option>
            </select>
          </div>
          <Field
            label="תוקף חברות בעמותה"
            type="date"
            value={current.membership_expiry_date?.slice(0, 10)}
            onChange={(v) => set('membership_expiry_date', v)}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>הערות (מנהל)</label>
          <textarea
            value={current.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            style={{ width: '100%', padding: 8, direction: 'rtl', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ marginTop: 16, textAlign: 'left' }}>
          <button onClick={handleSave} disabled={mutation.isPending} style={{ fontWeight: 500 }}>
            שמירת שינויים
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>נתונים מחושבים</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 13 }}>
          <Stat label="גיל" value={user.age ?? '—'} />
          <Stat label="כמות סדנאות (אסיסט)" value={user.assist_count} />
          <Stat label="סדנת סטודנט" value={user.student_workshop ?? '—'} />
          <Stat label="סדנה אחרונה" value={user.last_workshop ?? '—'} />
        </div>
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
