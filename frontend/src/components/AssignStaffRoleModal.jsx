import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as workshopsApi from '../api/workshops';

const STAFF_ROLE_LABELS = {
  coordinator: 'רכז',
  dj: 'DJ',
  facilitator: 'מנחה',
  translator: 'מתרגם',
  chaperone: 'מלווה',
};

const TRACK_LABELS = { adults: 'בוגרים', youth: 'נוער', general: 'כללי' };

/**
 * Modal opened from the user card to assign this user to a staff role
 * (coordinator/dj/facilitator/translator/chaperone) on a chosen workshop.
 * This is the mirror image of AddParticipantModal (which searches for a
 * user from the workshop side); here we search for a workshop from the
 * user side instead, but call the exact same backend endpoint.
 *
 * Uses a search-by-number text field (not a <select> of all workshops) --
 * with hundreds of historical workshops in the system, a single dropdown
 * listing every one of them doesn't scale and previously silently capped
 * at 200 results.
 */
export default function AssignStaffRoleModal({ userId, onClose }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [role, setRole] = useState('coordinator');
  const [serverError, setServerError] = useState('');

  const assignMutation = useMutation({
    mutationFn: () => workshopsApi.addParticipant(selectedWorkshop.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-history', userId] });
      onClose();
    },
    onError: (err) => setServerError(err.response?.data?.error || 'אירעה שגיאה בשיוך המשתמש'),
  });

  async function handleSearch(value) {
    setQuery(value);
    setSelectedWorkshop(null);
    setServerError('');
    if (value.trim().length === 0) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await workshopsApi.listWorkshops({ search: value.trim(), page: 1, pageSize: 20 });
      setResults(data.rows);
    } finally {
      setSearching(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    if (!selectedWorkshop) {
      setServerError('יש לבחור סדנה מהרשימה');
      return;
    }
    assignMutation.mutate();
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
      <form
        onSubmit={handleSubmit}
        style={{ background: '#fff', borderRadius: 8, padding: 24, width: 360, direction: 'rtl' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>שיוך לתפקיד צוות</h3>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 16 }}>
            ✕
          </button>
        </div>

        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>חיפוש סדנה לפי מספר</label>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="הקלד מספר סדנה..."
          style={{ width: '100%', padding: 8, direction: 'rtl', marginBottom: 8 }}
          autoFocus
        />

        {searching && <p style={{ fontSize: 13, color: '#888' }}>מחפש...</p>}

        {!searching && query.trim().length > 0 && results.length === 0 && (
          <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>לא נמצאה סדנה</p>
        )}

        {!selectedWorkshop && results.length > 0 && (
          <div style={{ border: '1px solid #e0e0e0', borderRadius: 6, marginBottom: 12, maxHeight: 160, overflowY: 'auto' }}>
            {results.map((w) => (
              <div
                key={w.id}
                onClick={() => {
                  setSelectedWorkshop(w);
                  setQuery(`#${w.workshop_number}`);
                  setResults([]);
                }}
                style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f0f0' }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#f5f6f8')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                #{w.workshop_number} — {TRACK_LABELS[w.track] || w.track} ({new Date(w.start_date).toLocaleDateString('he-IL')})
              </div>
            ))}
          </div>
        )}

        {selectedWorkshop && (
          <div style={{ background: '#e7f0fb', borderRadius: 6, padding: '8px 10px', marginBottom: 12, fontSize: 13 }}>
            נבחרה סדנה #{selectedWorkshop.workshop_number} — {TRACK_LABELS[selectedWorkshop.track] || selectedWorkshop.track}
          </div>
        )}

        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>תפקיד</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: 8, direction: 'rtl', marginBottom: 16 }}>
          {Object.entries(STAFF_ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {serverError && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{serverError}</p>}

        <button type="submit" disabled={assignMutation.isPending} style={{ width: '100%', fontWeight: 500 }}>
          {assignMutation.isPending ? 'משייך...' : 'שיוך לסדנה'}
        </button>
      </form>
    </div>
  );
}
