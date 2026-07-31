// الفواتير والدفعات

function BillingView({ invoices, orders, patients, accounts, actions }) {
  const [expandedId, setExpandedId] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'نقدي', accountId: accounts[0]?.id || '' });
  const [error, setError] = useState('');
  const collected = invoices.reduce((s, i) => s + invoicePaid(i), 0);
  const pending = invoices.reduce((s, i) => s + Math.max(0, i.amount - invoicePaid(i)), 0);
  const { page, setPage, totalPages, pageItems } = usePagination(invoices, 6);

  const unpaidByPatient = {};
  invoices.forEach((inv) => {
    if (inv.voided) return;
    const remaining = Math.max(0, inv.amount - invoicePaid(inv));
    if (remaining <= 0) return;
    const order = orders.find((o) => o.id === inv.order_id);
    const patient = patients.find((p) => p.id === order?.patient_id);
    if (!patient) return;
    unpaidByPatient[patient.id] = (unpaidByPatient[patient.id] || 0) + remaining;
  });
  const unpaidList = Object.entries(unpaidByPatient)
    .map(([pid, total]) => ({ patient: patients.find((p) => p.id === pid), total }))
    .sort((a, b) => b.total - a.total);

  const openPay = (inv) => { setExpandedId(inv.id === expandedId ? null : inv.id); setPayForm({ amount: '', method: 'نقدي', accountId: accounts[0]?.id || '' }); setError(''); };
  const submitPayment = async (inv) => {
    const amount = Number(payForm.amount);
    const remaining = inv.amount - invoicePaid(inv);
    if (isNaN(amount) || amount <= 0) { setError('أدخل مبلغاً صحيحاً أكبر من صفر'); return; }
    if (amount > remaining) { setError(`المبلغ أكبر من المتبقي (${SAR(remaining)})`); return; }
    if (!payForm.accountId) { setError('اختر الصندوق أو الحساب البنكي المستلم'); return; }
    await actions.addPayment(inv.id, amount, payForm.method, payForm.accountId);
    setExpandedId(null); setError('');
  };

  return (
    <div className="p-6 space-y-5">
      <div className="text-2xl font-bold" style={{ color: C.ink }}>الفواتير</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="إجمالي المحصّل" value={SAR(collected)} />
        <StatCard label="قيد التحصيل" value={SAR(pending)} tone={pending ? 'warning' : undefined} />
      </div>

      {unpaidList.length > 0 && (
        <div className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="font-bold mb-3" style={{ color: C.ink }}>حسابات المرضى غير المسددة</div>
          <div className="space-y-2">
            {unpaidList.map(({ patient, total }) => (
              <div key={patient.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div className="text-sm font-bold" style={{ color: C.ink }}>{patient.name}</div>
                <div className="text-sm font-mono font-bold" style={{ color: C.critical }}>{SAR(total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المريض</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الإجمالي</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المتبقي</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الحالة</th>
            <th></th>
          </tr></thead>
          <tbody>
            {pageItems.map((inv) => {
              const order = orders.find((o) => o.id === inv.order_id);
              const patient = patients.find((p) => p.id === order?.patient_id);
              const status = invoiceStatus(inv);
              const remaining = Math.max(0, inv.amount - invoicePaid(inv));
              const statusMap = { unpaid: ['warning', 'غير مدفوعة'], partial: ['accent', 'جزئية'], paid: ['normal', 'مدفوعة'], voided: ['muted', 'ملغاة'] };
              return (
                <React.Fragment key={inv.id}>
                  <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: C.ink }}>{patient?.name}</td>
                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap" style={{ color: C.ink }}>{SAR(inv.amount)}</td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: remaining ? C.critical : C.inkMuted }}>{SAR(remaining)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={statusMap[status][0]}>{statusMap[status][1]}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap">{status !== 'paid' && status !== 'voided' && <button onClick={() => openPay(inv)} className="text-xs font-bold" style={{ color: C.accent }}>تسجيل دفعة</button>}</td>
                  </tr>
                  {expandedId === inv.id && (
                    <tr style={{ background: C.bg }}>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex flex-wrap items-end gap-3">
                          <Field label="المبلغ"><input type="number" min="0" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-32 px-3 py-2 rounded-md text-sm font-mono" style={{ ...inputStyle, background: C.surface }} /></Field>
                          <Field label="طريقة الدفع"><select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="px-3 py-2 rounded-md text-sm" style={{ ...inputStyle, background: C.surface }}><option>نقدي</option><option>بطاقة</option><option>تحويل بنكي</option><option>تأمين طبي</option></select></Field>
                          <Field label="الصندوق/الحساب المستلم"><select value={payForm.accountId} onChange={(e) => setPayForm({ ...payForm, accountId: e.target.value })} className="px-3 py-2 rounded-md text-sm" style={{ ...inputStyle, background: C.surface }}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
                          <button onClick={() => submitPayment(inv)} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>تأكيد</button>
                          <button onClick={() => setExpandedId(null)} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
                        </div>
                        <ErrorNote>{error}</ErrorNote>
                        {inv.payments && inv.payments.length > 0 && <div className="mt-3 text-xs space-y-1" style={{ color: C.inkMuted }}>{inv.payments.map((p) => <div key={p.id}>{fmtDate(p.created_at)} · {SAR(p.amount)} · {p.method}</div>)}</div>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
}
