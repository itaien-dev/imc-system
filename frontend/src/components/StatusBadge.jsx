const COLOR_MAP = {
  // Membership status
  'כן': { bg: '#e6f4ea', text: '#1e7e34' },
  'זכאי': { bg: '#e7f0fb', text: '#1a56b0' },
  'פג': { bg: '#fdecea', text: '#c0392b' },
  'לא': { bg: '#f1f1f1', text: '#666' },
  // Acceptance criterion
  'אסיסט ראשון': { bg: '#e7f0fb', text: '#1a56b0' },
  'מגייסים': { bg: '#e6f4ea', text: '#1e7e34' },
  'לא השתתף מעל שנה': { bg: '#fff4e0', text: '#9a6700' },
  'איזונים': { bg: '#f1f1f1', text: '#666' },
};

export default function StatusBadge({ value }) {
  const colors = COLOR_MAP[value] || { bg: '#f1f1f1', text: '#666' };
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        padding: '2px 10px',
        borderRadius: 6,
        fontSize: 12,
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  );
}
