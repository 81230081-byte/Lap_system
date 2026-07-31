// سجل التدقيق


// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
function AuditLogView({ auditLog }) {
  const [query, setQuery] = useState('');
  const filtered = auditLog.filter((a) => a.action.includes(query) || (a.details || '').includes(query) || (a.user_name || '').includes(query));
  const { page, setPage, totalPages, pageItems } = usePagination(filtered, 8, query);
  return (
    <div className="p-6 space-y-5">
      <div className="text-2xl font-bold" style={{ color: C.ink }}>سجل التدقيق</div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث في السجل..." className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ ...inputStyle, background: C.surface }} />
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الوقت</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المستخدم</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الإجراء</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>التفاصيل</th>
          </tr></thead>
          <tbody>
            {pageItems.map((a) => (
              <tr key={a.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.inkMuted }}>{fmtDateTime(a.created_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: C.inkMuted }}>{a.user_name}</td>
                <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: C.ink }}>{a.action}</td>
                <td className="px-4 py-3" style={{ color: C.inkMuted }}>{a.details}</td>
              </tr>
            ))}
            {pageItems.length === 0 && <tr><td colSpan={4}><EmptyState text="لا توجد سجلات مطابقة" /></td></tr>}
          </tbody>
        </table>
        <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
