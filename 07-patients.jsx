// إدارة المرضى + سجل الفحوصات التاريخي لكل مريض

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------
function PatientsView({ patients, orders, actions, askConfirm, onViewOrders, onViewHistory, onViewStatement, isManager, can, pendingAction, clearPendingAction }) {
  const canDelete = isManager || (can && can('delete_patients'));
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    if (pendingAction === 'new-patient') { setShowForm(true); clearPendingAction(); }
  }, [pendingAction]);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', age: '', gender: 'ذكر', phone: '' });
  const [error, setError] = useState('');

  const filtered = patients.filter((p) => p.name.includes(query) || (p.phone || '').includes(query));
  const { page, setPage, totalPages, pageItems } = usePagination(filtered, 6, query);

  const resetForm = () => { setForm({ name: '', age: '', gender: 'ذكر', phone: '' }); setEditingId(null); setShowForm(false); setError(''); };
  const startEdit = (p) => { setEditingId(p.id); setForm({ name: p.name, age: String(p.age || ''), gender: p.gender || 'ذكر', phone: p.phone || '' }); setShowForm(true); setError(''); };

  const submit = async () => {
    if (!form.name.trim()) { setError('الاسم الكامل مطلوب'); return; }
    if (!PHONE_RE.test(form.phone.trim())) { setError('رقم الهاتف غير صالح'); return; }
    const age = Number(form.age);
    if (!form.age || isNaN(age) || age < 0 || age > 120) { setError('العمر يجب أن يكون رقماً بين 0 و120'); return; }
    const dup = patients.find((p) => p.id !== editingId && p.name.trim() === form.name.trim() && p.phone.trim() === form.phone.trim());
    if (dup) { setError('يوجد مريض بنفس الاسم ورقم الهاتف'); return; }
    setError('');
    if (editingId) await actions.updatePatient(editingId, { name: form.name.trim(), age, gender: form.gender, phone: form.phone.trim() });
    else await actions.addPatient({ name: form.name.trim(), age, gender: form.gender, phone: form.phone.trim() });
    resetForm();
  };

  const onDelete = (p) => {
    const count = orders.filter((o) => o.patient_id === p.id).length;
    if (count > 0) { setError(`لا يمكن حذف "${p.name}" — لديه ${count} طلب مسجل`); return; }
    askConfirm({ title: 'حذف مريض', message: `هل تريد حذف "${p.name}" نهائياً؟`, danger: true, onConfirm: () => actions.deletePatient(p.id, p.name) });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-2xl font-bold" style={{ color: C.ink }}>المرضى <span className="text-sm font-normal" style={{ color: C.inkMuted }}>({patients.length})</span></div>
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>+ مريض جديد</button>
      </div>
      {showForm && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="الاسم الكامل"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
            <Field label="العمر"><input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="الجنس"><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}><option>ذكر</option><option>أنثى</option></select></Field>
            <Field label="رقم الهاتف"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex gap-2">
            <button onClick={submit} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>{editingId ? 'حفظ التعديلات' : 'حفظ المريض'}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
          </div>
        </div>
      )}
      {!showForm && <ErrorNote>{error}</ErrorNote>}
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ ...inputStyle, background: C.surface }} />
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الاسم</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>العمر</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الجنس</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الهاتف</th>
            <th></th>
          </tr></thead>
          <tbody>
            {pageItems.map((p) => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: C.ink }}>{p.name}</td>
                <td className="px-4 py-3 font-mono" style={{ color: C.inkMuted }}>{p.age}</td>
                <td className="px-4 py-3" style={{ color: C.inkMuted }}>{p.gender}</td>
                <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: C.inkMuted }}>{p.phone}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <button onClick={() => onViewOrders(p.id)} className="text-xs font-bold" style={{ color: C.accent }}>الطلبات</button>
                    <button onClick={() => onViewHistory(p.id)} className="text-xs font-bold" style={{ color: C.accent }}>السجل</button>
                    <button onClick={() => onViewStatement(p.id)} className="text-xs font-bold" style={{ color: C.accent }}>كشف حساب</button>
                    <button onClick={() => startEdit(p)} className="text-xs font-bold" style={{ color: C.accent }}>تعديل</button>
                    {canDelete && <button onClick={() => onDelete(p)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button>}
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && <tr><td colSpan={5}><EmptyState text="لا يوجد مرضى مطابقون" /></td></tr>}
          </tbody>
        </table>
        <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Patient test history / trends
// ---------------------------------------------------------------------------
const HISTORY_STATUS_LABEL = { pending: 'قيد الانتظار', pending_review: 'بانتظار الاعتماد', completed: 'مكتمل', cancelled: 'ملغى' };
const HISTORY_STATUS_TONE = { pending: 'warning', pending_review: 'accent', completed: 'normal', cancelled: 'muted' };

function PatientHistoryView({ patient, orders, catalog, setView, setActiveOrderId, labSettings }) {
  if (!patient) return <div className="p-6"><EmptyState text="لم يتم تحديد مريض" /></div>;
  const visits = orders.filter((o) => o.patient_id === patient.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const completed = visits.filter((o) => o.status === 'completed').slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const byTest = {};
  const qualByTest = {};
  completed.forEach((o) => {
    Object.entries(o.results || {}).forEach(([testId, value]) => {
      const test = catalog.find((c) => c.id === testId);
      if (test && test.value_type === 'qualitative') {
        if (!qualByTest[testId]) qualByTest[testId] = [];
        qualByTest[testId].push({ date: o.created_at, value, sampleId: o.sample_id });
        return;
      }
      if (!byTest[testId]) byTest[testId] = [];
      byTest[testId].push({ date: o.created_at, value, sampleId: o.sample_id });
    });
  });
  const testIds = Object.keys(byTest);
  const qualTestIds = Object.keys(qualByTest);

  const openReport = (orderId) => { setActiveOrderId(orderId); setView('report'); };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <div className="text-2xl font-bold" style={{ color: C.ink }}>السجل التاريخي — {patient.name}</div>
          <div className="text-sm" style={{ color: C.inkMuted }}>{patient.age} سنة · {patient.gender} · {visits.length} زيارة مسجّلة ({completed.length} مكتملة)</div>
        </div>
        <button onClick={() => window.print()} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>تصدير PDF / طباعة</button>
      </div>

      <div className="printable-area space-y-5">
        <div className="hidden print:block mb-2">
          <div className="text-lg font-bold" style={{ color: C.ink }}>{labSettings?.name || 'مختبر الشموخ'} — السجل التاريخي</div>
          <div className="text-sm" style={{ color: C.inkMuted }}>{patient.name} · {patient.age} سنة · {patient.gender}</div>
        </div>

        <div className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="px-4 py-3 font-bold text-sm" style={{ borderBottom: `1px solid ${C.line}`, color: C.ink }}>سجل الزيارات</div>
          {visits.length === 0 ? <EmptyState text="لا توجد زيارات مسجّلة لهذا المريض بعد" /> : (
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
                <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>التاريخ</th>
                <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>رقم العينة</th>
                <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>عدد الفحوصات</th>
                <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>الحالة</th>
                <th className="text-right px-4 py-2.5 font-bold no-print"></th>
              </tr></thead>
              <tbody>
                {visits.map((o) => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: C.ink }}>{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: C.inkMuted }}>{o.sample_id}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: C.inkMuted }}>{(o.test_ids || []).length}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap"><Badge tone={HISTORY_STATUS_TONE[o.status]}>{HISTORY_STATUS_LABEL[o.status] || o.status}</Badge>{o.has_critical && <span className="mr-1.5" style={{ color: C.criticalDeep }}>⚠</span>}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap no-print">{o.status === 'completed' && <button onClick={() => openReport(o.id)} className="text-xs font-bold" style={{ color: C.accent }}>عرض التقرير</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <div className="font-bold text-sm mb-3" style={{ color: C.ink }}>اتجاه الفحوصات عبر الزمن</div>
          {testIds.length === 0 ? (
            <EmptyState text="لا يوجد سجل نتائج مكتملة بعد لعرض اتجاهها" />
          ) : (
            <div className="space-y-4">
              {testIds.map((testId) => {
                const test = catalog.find((c) => c.id === testId);
                if (!test) return null;
                const points = byTest[testId];
                const r = resolveTestRanges(test, patient);
                return (
                  <div key={testId} className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}`, breakInside: 'avoid' }}>
                    <div className="font-bold text-sm mb-3" style={{ color: C.ink }}>
                      {test.name} <span className="font-normal text-xs" style={{ color: C.inkMuted }}>(<bdi dir="ltr">{r.min}–{r.max} {test.unit}</bdi>)</span>
                    </div>
                    <div className="space-y-2">
                      {points.map((pt, idx) => {
                        const prev = idx > 0 ? points[idx - 1].value : null;
                        const trend = prev === null ? null : pt.value > prev ? 'up' : pt.value < prev ? 'down' : 'flat';
                        return (
                          <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                            <div className="font-mono text-xs w-28 shrink-0" style={{ color: C.inkMuted }}>{fmtDate(pt.date)}</div>
                            <div className="flex-1"><RangeGauge value={pt.value} min={r.min} max={r.max} critLow={r.critLow} critHigh={r.critHigh} /></div>
                            <div className="font-mono font-bold shrink-0" style={{ color: C.ink }}>{pt.value} {test.unit}</div>
                            <div className="w-5 text-center shrink-0">
                              {trend === 'up' && <span style={{ color: C.warning }}>▲</span>}
                              {trend === 'down' && <span style={{ color: C.accent }}>▼</span>}
                              {trend === 'flat' && <span style={{ color: C.inkFaint }}>→</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {qualTestIds.length > 0 && (
          <div>
            <div className="font-bold text-sm mb-3" style={{ color: C.ink }}>سجل الفحوصات النوعية (إيجابي/سلبي)</div>
            <div className="space-y-3">
              {qualTestIds.map((testId) => {
                const test = catalog.find((c) => c.id === testId);
                if (!test) return null;
                return (
                  <div key={testId} className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}`, breakInside: 'avoid' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: C.ink }}>{test.name}</div>
                    <div className="space-y-1.5">
                      {qualByTest[testId].map((pt, idx) => {
                        const status = classifyResult(pt.value, test, patient);
                        return (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="font-mono text-xs" style={{ color: C.inkMuted }}>{fmtDate(pt.date)}</div>
                            <Badge tone={status === 'abnormal' ? 'critical' : 'normal'}>{QUALITATIVE_LABEL[pt.value] || pt.value}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// كشف حساب المريض — قابل للطباعة
// ---------------------------------------------------------------------------
function PatientStatementView({ patient, orders, invoices, labSettings, onBack }) {
  if (!patient) return <div className="p-6"><EmptyState text="لم يتم تحديد مريض" /></div>;
  const patientOrderIds = new Set(orders.filter((o) => o.patient_id === patient.id).map((o) => o.id));
  const patientInvoices = invoices.filter((inv) => patientOrderIds.has(inv.order_id) && !inv.voided);

  const events = [];
  patientInvoices.forEach((inv) => {
    const order = orders.find((o) => o.id === inv.order_id);
    events.push({ date: inv.created_at, desc: `فاتورة فحوصات${order ? ' — ' + order.sample_id : ''}`, debit: Number(inv.amount), credit: 0 });
    (inv.payments || []).forEach((pay) => {
      events.push({ date: pay.created_at, desc: `دفعة (${pay.method})`, debit: 0, credit: Number(pay.amount) });
    });
  });
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const rows = events.map((e) => { running += e.debit - e.credit; return { ...e, balance: running }; });
  const totalDebit = events.reduce((s, e) => s + e.debit, 0);
  const totalCredit = events.reduce((s, e) => s + e.credit, 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between no-print flex-wrap gap-3">
        <button onClick={onBack} className="text-sm font-bold" style={{ color: C.accent }}>‹ رجوع للمرضى</button>
        <button onClick={() => window.print()} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>طباعة / PDF</button>
      </div>
      <div className="printable-area rounded-lg p-5 md:p-8" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 mb-4" style={{ borderBottom: `2px solid ${C.ink}` }}>
          <div className="flex items-center gap-3">
            <img src={labSettings?.logo_b64 || LOGO_B64} alt="شعار" style={{ height: 44, width: 'auto' }} />
            <div>
              <div className="text-lg font-bold" style={{ color: C.ink }}>{labSettings?.name || 'مختبر الشموخ'}</div>
              <div className="text-xs" style={{ color: C.inkMuted }}>كشف حساب مريض</div>
            </div>
          </div>
          <div className="text-left text-xs font-mono" style={{ color: C.inkMuted }}>تاريخ الإصدار: {fmtDate(new Date().toISOString())}</div>
        </div>
        <div className="mb-5 text-sm">
          <div><span style={{ color: C.inkMuted }}>المريض: </span><span className="font-bold" style={{ color: C.ink }}>{patient.name}</span></div>
          {patient.phone && <div><span style={{ color: C.inkMuted }}>الهاتف: </span><span className="font-mono" style={{ color: C.ink }}>{patient.phone}</span></div>}
        </div>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `2px solid ${C.ink}` }}>
            <th className="text-right py-2 font-bold" style={{ color: C.inkMuted }}>التاريخ</th>
            <th className="text-right py-2 font-bold" style={{ color: C.inkMuted }}>البيان</th>
            <th className="text-right py-2 font-bold" style={{ color: C.inkMuted }}>مدين (على المريض)</th>
            <th className="text-right py-2 font-bold" style={{ color: C.inkMuted }}>دائن (سُدّد)</th>
            <th className="text-right py-2 font-bold" style={{ color: C.inkMuted }}>الرصيد</th>
          </tr></thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="py-2 font-mono text-xs" style={{ color: C.inkMuted }}>{fmtDate(r.date)}</td>
                <td className="py-2" style={{ color: C.ink }}>{r.desc}</td>
                <td className="py-2 font-mono" style={{ color: r.debit ? C.critical : C.inkFaint }}>{r.debit ? SAR(r.debit) : '—'}</td>
                <td className="py-2 font-mono" style={{ color: r.credit ? C.normal : C.inkFaint }}>{r.credit ? SAR(r.credit) : '—'}</td>
                <td className="py-2 font-mono font-bold" style={{ color: C.ink }}>{SAR(r.balance)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5}><EmptyState text="لا توجد عمليات مسجّلة لهذا المريض" /></td></tr>}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: `2px solid ${C.ink}` }}>
                <td colSpan={2} className="py-2 font-bold" style={{ color: C.ink }}>الإجمالي</td>
                <td className="py-2 font-mono font-bold" style={{ color: C.critical }}>{SAR(totalDebit)}</td>
                <td className="py-2 font-mono font-bold" style={{ color: C.normal }}>{SAR(totalCredit)}</td>
                <td className="py-2 font-mono font-bold" style={{ color: C.ink }}>{SAR(running)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
