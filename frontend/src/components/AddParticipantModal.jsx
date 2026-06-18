import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../api/users';
import * as workshopsApi from '../api/workshops';

const STAFF_ROLE_LABELS = {
  coordinator: 'רכז',
  dj: 'DJ',
  facilitator: 'מנחה',
  translator: 'מתרגם',
  chaperone: 'מלווה',
};

/**
 * Modal for manually adding a user to a workshop, in the role matching the active tab.
 * For the "staff" tab, lets the admin pick which specific staff role to assign.
 *
 * Eligibility rules (enforced again server-side as the source of truth):
 * - A user may be added as student only if they have no student link anywhere yet.
 * - A user may be added as assistant/staff only if they DO have a student link
 *   somewhere, but not to the same workshop where they were the student.
 */
export default function AddParticipantModal({ workshopId, tab, onClose }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [staffRole, setStaffRole] = useState('coordinator');
  const [serverError, setServerError] = useState('');

  const targetRole = tab === 'staff' ? staffRole : tab;

  const addMutation = useMutation({
    mutationFn: (userId) => workshopsApi.addParticipant(workshopId, userId, targetRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', workshopId, tab] });
      queryClient.invalidateQueries({ queryKey: ['workshop', workshopId] });
      onClose();
    },
    onError: (err) => setServerError(err.response?.data?.error || 'אירעה שגיאה בהוספת המשתמש'),
  });

  async function handleSearch(value) {
    setQuery(value);
    setServerError('');
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await usersApi.searchUsers(value);
      setResults(data);
    } finally {
      setSearching(false);
    }
  }

  function eligibility(user) {
    if (tab === 'student') {
      if (user.has_student_link) return { ok: false, reason: 'כבר רשום כסטודנט בסדנה אחרת' };
      return { ok: true };
    }
    // assistant / staff
    if (!user.has_student_link) return { ok: false, reason: 'לא היה סטודנט בעבר' };
    if (user.student_workshop_id === workshopId) {
      return { ok: false, reason: 'היה סטודנט באותה סדנה' };
    }
    return { ok: true };
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 420, direction: 'rtl' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>
            הוספת {tab === 'student' ? 'סטודנט' : tab === 'assistant' ? 'אסיסטנט' : 'איש צוות'}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 16 }}>
            ✕
          </button>
        </div>

        {tab === 'staff' && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>תפקיד</label>
            <select
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value)}
              style={{ width: '100%', padding: 8, direction: 'rtl' }}
            >
              {Object.entries(STAFF_ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>חיפוש לפי שם או דוא"ל</label>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="הקלד לפחות 2 תווים..."
          style={{ width: '100%', padding: 8, direction: 'rtl', marginBottom: 12 }}
          autoFocus
        />

        {searching && <p style={{ fontSize: 13, color: '#888' }}>מחפש...</p>}

        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <p style={{ fontSize: 13, color: '#888' }}>לא נמצאו משתמשים</p>
        )}

        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {results.map((user) => {
            const elig = eligibility(user);
            return (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  border: '1px solid #e0e0e0',
                  borderRadius: 6,
                  marginBottom: 6,
                  opacity: elig.ok ? 1 : 0.6,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{user.full_name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{user.email}</p>
                  {!elig.ok && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#c0392b' }}>{elig.reason}</p>}
                </div>
                <button
                  disabled={!elig.ok || addMutation.isPending}
                  onClick={() => {
                    setServerError('');
                    addMutation.mutate(user.id);
                  }}
                  style={{ fontSize: 12 }}
                >
                  הוספה
                </button>
              </div>
            );
          })}
        </div>

        {serverError && <p style={{ color: '#c0392b', fontSize: 13, marginTop: 10 }}>{serverError}</p>}
      </div>
    </div>
  );
}
