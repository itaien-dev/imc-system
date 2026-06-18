import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as workshopsApi from '../api/workshops';

export default function CloseWorkshopPage() {
  const { id } = useParams();
  const workshopId = Number(id);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['closing-summary', workshopId],
    queryFn: () => workshopsApi.getClosingSummary(workshopId),
  });

  const [result, setResult] = useState(null);

  if (isLoading || !data) return <p>טוען...</p>;

  return (
    <ClosingForm workshopId={workshopId} data={data} navigate={navigate} result={result} setResult={setResult} />
  );
}

/**
 * Separated into its own component so its checkbox state can be initialized directly
 * from `data` via useState's initializer — `data` is guaranteed present here (the parent
 * only renders this once loading is done), so there's no need for an effect just to
 * sync local state from a query result.
 */
function ClosingForm({ workshopId, data, navigate, result, setResult }) {
  const [attendedIds, setAttendedIds] = useState(() => data.assistants.map((a) => a.link_id));
  const [signupIds, setSignupIds] = useState(() => data.pendingSignups.map((s) => s.id));

  const mutation = useMutation({
    mutationFn: () =>
      workshopsApi.closeWorkshop(workshopId, {
        attendedAssistantLinkIds: attendedIds,
        processedSignupIds: signupIds,
      }),
    onSuccess: (data) => setResult(data),
  });

  function toggleAttended(linkId) {
    setAttendedIds((prev) => (prev.includes(linkId) ? prev.filter((x) => x !== linkId) : [...prev, linkId]));
  }
  function toggleSignup(signupId) {
    setSignupIds((prev) => (prev.includes(signupId) ? prev.filter((x) => x !== signupId) : [...prev, signupId]));
  }

  if (result) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
        <h3>הסדנה נסגרה בהצלחה</h3>
        <p>
          {result.createdUsers.length > 0
            ? `נוצרו ${result.createdUsers.length} משתמשים חדשים: ${result.createdUsers
                .map((u) => u.full_name)
                .join(', ')}`
            : 'לא נוצרו משתמשים חדשים.'}
        </p>
        <button onClick={() => navigate(`/admin/workshops/${workshopId}`)}>חזרה לכרטיס הסדנה</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate(`/admin/workshops/${workshopId}`)} style={{ marginBottom: 16 }}>
        ← חזרה לכרטיס הסדנה
      </button>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>סגירת סדנה — עדכון משתתפים</h3>
        <p style={{ fontSize: 13, color: '#666' }}>
          סמנו אסיסטנטים שהשתתפו בפועל. סטודנטים שסומנו יוקמו כמשתמשים חדשים אוטומטית (אם אינם קיימים עדיין לפי דוא"ל).
        </p>

        <h4 style={{ marginTop: 20, fontSize: 14 }}>אסיסטנטים</h4>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 6 }}>
          {data.assistants.length === 0 && <p style={{ padding: 12, color: '#999' }}>אין אסיסטנטים רשומים</p>}
          {data.assistants.map((a, i) => (
            <label
              key={a.link_id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderTop: i > 0 ? '1px solid #e0e0e0' : 'none',
                fontSize: 13,
              }}
            >
              <span>
                <input
                  type="checkbox"
                  checked={attendedIds.includes(a.link_id)}
                  onChange={() => toggleAttended(a.link_id)}
                  style={{ marginInlineEnd: 8 }}
                />
                {a.full_name}
              </span>
              <span style={{ color: '#666' }}>אסיסטנט</span>
            </label>
          ))}
        </div>

        <h4 style={{ marginTop: 20, fontSize: 14 }}>סטודנטים שנרשמו (ייובאו כמשתמשים)</h4>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 6 }}>
          {data.pendingSignups.length === 0 && <p style={{ padding: 12, color: '#999' }}>אין הרשמות סטודנט בהמתנה</p>}
          {data.pendingSignups.map((s, i) => (
            <label
              key={s.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderTop: i > 0 ? '1px solid #e0e0e0' : 'none',
                fontSize: 13,
              }}
            >
              <span>
                <input
                  type="checkbox"
                  checked={signupIds.includes(s.id)}
                  onChange={() => toggleSignup(s.id)}
                  style={{ marginInlineEnd: 8 }}
                />
                {s.full_name} ({s.email})
              </span>
              {s.will_create_new_user && (
                <span style={{ background: '#e7f0fb', color: '#1a56b0', fontSize: 11, padding: '2px 8px', borderRadius: 6 }}>
                  משתמש חדש
                </span>
              )}
            </label>
          ))}
        </div>

        <div style={{ marginTop: 20, textAlign: 'left' }}>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} style={{ fontWeight: 500 }}>
            {mutation.isPending ? 'מעבד...' : 'סגירת סדנה ועדכון נתונים'}
          </button>
        </div>
      </div>
    </div>
  );
}
