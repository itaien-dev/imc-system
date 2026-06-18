import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import * as workshopsApi from '../api/workshops';

const EMPTY_FORM = {
  workshop_number: '',
  cycle_number: '',
  track: 'adults',
  start_date: '',
  end_date: '',
  publish_start_date: '',
  publish_end_date: '',
  feedback_date: '',
  email: '',
  notes: '',
};

export default function CreateWorkshopPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      workshopsApi.createWorkshop({
        ...form,
        workshop_number: Number(form.workshop_number),
        cycle_number: Number(form.cycle_number),
        feedback_date: form.feedback_date || null,
        email: form.email || null,
        notes: form.notes || null,
      }),
    onSuccess: (workshop) => navigate(`/admin/workshops/${workshop.id}`),
    onError: (err) => setError(err.response?.data?.error || 'אירעה שגיאה ביצירת הסדנה'),
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
      <button onClick={() => navigate('/admin/workshops')} style={{ marginBottom: 16 }}>
        ← חזרה לרשימת הסדנאות
      </button>

      <h2>הוספת סדנה חדשה</h2>

      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="מספר סדנה" type="number" value={form.workshop_number} onChange={(v) => set('workshop_number', v)} required />
          <Field label="מספר סבב" type="number" value={form.cycle_number} onChange={(v) => set('cycle_number', v)} required />

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>שיוך</label>
            <select
              value={form.track}
              onChange={(e) => set('track', e.target.value)}
              style={{ width: '100%', padding: 8, direction: 'rtl' }}
            >
              <option value="adults">בוגרים</option>
              <option value="youth">נוער</option>
              <option value="general">כללי</option>
            </select>
          </div>
          <Field label="כתובת מייל של הסדנה" type="email" value={form.email} onChange={(v) => set('email', v)} />

          <Field label="תאריך תחילת סדנה" type="date" value={form.start_date} onChange={(v) => set('start_date', v)} required />
          <Field label="תאריך תום סדנה" type="date" value={form.end_date} onChange={(v) => set('end_date', v)} required />

          <Field
            label="תאריך תחילת פרסום"
            type="date"
            value={form.publish_start_date}
            onChange={(v) => set('publish_start_date', v)}
            required
          />
          <Field
            label="תאריך תום פרסום"
            type="date"
            value={form.publish_end_date}
            onChange={(v) => set('publish_end_date', v)}
            required
          />

          <Field label="תאריך משוב" type="date" value={form.feedback_date} onChange={(v) => set('feedback_date', v)} />
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

        {error && <p style={{ color: '#c0392b', fontSize: 13, marginTop: 12 }}>{error}</p>}

        <div style={{ marginTop: 16, textAlign: 'left' }}>
          <button type="submit" disabled={mutation.isPending} style={{ fontWeight: 500 }}>
            {mutation.isPending ? 'יוצר...' : 'יצירת סדנה'}
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
