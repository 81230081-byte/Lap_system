// الطلبات/العينات: الإنشاء، إدخال النتائج، الاعتماد أو الرفض، والتقرير القابل للطباعة

function OrdersView({ patients, catalog, orders, inventory, accounts, actions, setView, setActiveOrderId, filterPatientId, clearFilter, askConfirm, isManager, can, pendingAction, clearPendingAction }) {
  const canVerify = can ? can('verify_results') : isManager;
  const [tab, setTab] = useState('list');
  useEffect(() => {
    if (pendingAction === 'new-order') { setTab('new'); clearPendingAction(); }
  }, [pendingAction]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedTests, setSelectedTests] = useState([]);
  const [referringDoctor, setReferringDoctor] = useState('');
  const [paymentType, setPaymentType] = useState('credit');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState(null);

  const knownDoctors = [...new Set(orders.map((o) => o.referring_doctor).filter(Boolean))];
  const cashAccounts = (accounts || []).filter((a) => a.type === 'نقدي');
  const bankAccounts = (accounts || []).filter((a) => a.type === 'بنكي');

  const total = catalog.filter((c) => selectedTests.includes(c.id)).reduce((s, c) => s + Number(c.price), 0);
  const paymentNeedsAccount = paymentType === 'cash' || paymentType === 'transfer';
  const canSubmit = Boolean(selectedPatient) && selectedTests.length > 0 && !busy && (!paymentNeedsAccount || Boolean(paymentAccountId));
  const toggleTest = (id) => setSelectedTests((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const lowStockWarnings = catalog.filter((c) => selectedTests.includes(c.id) && c.consumes_item_id)
    .map((c) => inventory.find((i) => i.id === c.consumes_item_id)).filter((item) => item && item.quantity <= item.threshold);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    await actions.addOrder(selectedPatient, selectedTests, referringDoctor.trim() || null, paymentType, paymentNeedsAccount ? paymentAccountId : null);
    setBusy(false);
    setSelectedPatient(''); setSelectedTests([]); setReferringDoctor(''); setPaymentType('credit'); setPaymentAccountId(''); setTab('list');
  };

  let visible = filterPatientId ? orders.filter((o) => o.patient_id === filterPatientId) : orders;
  if (statusFilter !== 'all') visible = visible.filter((o) => o.status === statusFilter);
  if (query.trim()) {
    const q = query.trim();
    visible = visible.filter((o) => {
      const patient = patients.find((p) => p.id === o.patient_id);
      return (patient && patient.name.includes(q)) || (o.sample_id || '').includes(q);
    });
  }
  const { page, setPage, totalPages, pageItems } = usePagination(visible, 6, query + statusFilter + filterPatientId);

  const onCancel = (o) => askConfirm({ title: 'إلغاء الطلب', message: `هل تريد إلغاء الطلب ${o.sample_id}؟`, danger: true, confirmLabel: 'إلغاء الطلب', onConfirm: () => actions.cancelOrder(o.id, o.sample_id) });
  const onVerify = (o) => askConfirm({ title: 'اعتماد النتائج', message: `هل تريد اعتماد نتائج الطلب ${o.sample_id}؟ سيصبح التقرير متاحاً للطباعة.`, confirmLabel: 'اعتماد', onConfirm: () => actions.verifyResults(o.id, o.sample_id) });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-2xl font-bold" style={{ color: C.ink }}>الطلبات والعينات</div>
          {filterPatientId && <button onClick={clearFilter} className="text-xs font-bold" style={{ color: C.accent }}>عرض طلبات مريض واحد — إلغاء ×</button>}
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          <button onClick={() => setTab('list')} className="px-4 py-2 text-sm font-bold" style={{ background: tab === 'list' ? C.accent : C.surface, color: tab === 'list' ? '#fff' : C.inkMuted }}>قائمة الطلبات</button>
          <button onClick={() => setTab('new')} className="px-4 py-2 text-sm font-bold" style={{ background: tab === 'new' ? C.accent : C.surface, color: tab === 'new' ? '#fff' : C.inkMuted }}>طلب جديد</button>
        </div>
      </div>

      {tab === 'new' ? (
        <div className="rounded-lg p-5 space-y-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <Field label="المريض">
            <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
              <option value="">اختر مريضاً...</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="الطبيب المحوّل (اختياري)">
            <input list="referring-doctors-list" value={referringDoctor} onChange={(e) => setReferringDoctor(e.target.value)} placeholder="اسم الطبيب..." className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} />
            <datalist id="referring-doctors-list">{knownDoctors.map((d) => <option key={d} value={d} />)}</datalist>
          </Field>
          <div>
            <div className="text-xs font-bold mb-2" style={{ color: C.inkMuted }}>الفحوصات المطلوبة</div>
            {groupByCategory(catalog).map(([cat, tests]) => {
              const catSelectedCount = tests.filter((c) => selectedTests.includes(c.id)).length;
              return (
                <div key={cat} className="mb-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold" style={{ color: C.accentDark }}>{cat}</span>
                    {catSelectedCount > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: C.accentSoft, color: C.accentDark }}>{catSelectedCount}</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {tests.map((c) => {
                      const checked = selectedTests.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md cursor-pointer text-sm" style={{ background: checked ? C.accentSoft : C.bg, border: `1px solid ${checked ? C.accent : C.line}` }}>
                          <span className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={() => toggleTest(c.id)} /><span style={{ color: C.ink }}>{c.name}</span></span>
                          <span className="font-mono text-xs" style={{ color: C.inkMuted }}>{SAR(c.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {lowStockWarnings.length > 0 && <ErrorNote>تنبيه مخزون: {lowStockWarnings.map((w) => w.name).join('، ')} منخفض حالياً</ErrorNote>}
          <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="text-xs font-bold mb-1" style={{ color: C.inkMuted }}>طريقة الدفع</div>
            <div className="flex flex-wrap gap-2">
              {[['credit', 'آجل (على حساب المريض)'], ['cash', 'نقدي'], ['transfer', 'حوالة بنكية']].map(([key, label]) => (
                <button key={key} type="button" onClick={() => { setPaymentType(key); setPaymentAccountId(''); }} className="px-3.5 py-2 rounded-md text-sm font-bold" style={{ background: paymentType === key ? C.accent : C.bg, color: paymentType === key ? '#fff' : C.inkMuted, border: `1px solid ${paymentType === key ? C.accent : C.line}` }}>{label}</button>
              ))}
            </div>
            {paymentType === 'cash' && (
              <Field label="الصندوق المستلم للمبلغ">
                <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                  <option value="">اختر الصندوق...</option>
                  {cashAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {cashAccounts.length === 0 && <div className="text-xs mt-1" style={{ color: C.critical }}>لا يوجد صندوق نقدي مسجّل — أضِفه من الصناديق والبنوك أولاً</div>}
              </Field>
            )}
            {paymentType === 'transfer' && (
              <Field label="الحساب البنكي المستلم للحوالة">
                <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                  <option value="">اختر الحساب البنكي...</option>
                  {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.bank_name ? ` — ${a.bank_name}` : ''}</option>)}
                </select>
                {bankAccounts.length === 0 && <div className="text-xs mt-1" style={{ color: C.critical }}>لا يوجد حساب بنكي مسجّل — أضِفه من الصناديق والبنوك أولاً</div>}
              </Field>
            )}
            {paymentType === 'credit' && <div className="text-xs" style={{ color: C.inkFaint }}>سيُرحَّل المبلغ كاملاً كذمة على حساب المريض حتى يُسدَّد لاحقاً من شاشة الفواتير.</div>}
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="text-sm" style={{ color: C.inkMuted }}>الإجمالي: <span className="font-mono font-bold text-base" style={{ color: C.ink }}>{SAR(total)}</span></div>
            <button onClick={submit} className="px-4 py-2.5 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff', opacity: canSubmit ? 1 : 0.4 }}>{busy ? '...جارِ الحفظ' : 'تسجيل الطلب'}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث باسم المريض أو رقم العينة..." className="flex-1 min-w-[200px] px-3 py-2.5 rounded-lg text-sm" style={{ ...inputStyle, background: C.surface }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg text-sm" style={{ ...inputStyle, background: C.surface }}>
              <option value="all">كل الحالات</option><option value="pending">قيد الانتظار</option><option value="pending_review">بانتظار الاعتماد</option><option value="completed">مكتمل</option><option value="cancelled">ملغى</option>
            </select>
          </div>
          <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
                <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>رقم العينة</th>
                <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المريض</th>
                <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>التاريخ</th>
                <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الحالة</th>
                <th></th>
              </tr></thead>
              <tbody>
                {pageItems.map((o) => {
                  const patient = patients.find((p) => p.id === o.patient_id);
                  return (
                    <tr key={o.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.inkMuted }}>{o.sample_id}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold" style={{ color: C.ink }}>{patient?.name}</div>
                        {o.referring_doctor && <div className="text-xs" style={{ color: C.inkMuted }}>د. {o.referring_doctor}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.inkMuted }}>{fmtDate(o.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {o.status === 'pending' && <Badge tone="warning">قيد الانتظار</Badge>}
                        {o.status === 'pending_review' && <Badge tone="accent">بانتظار الاعتماد</Badge>}
                        {o.status === 'completed' && <Badge tone={o.has_critical ? 'critical' : 'normal'}>{o.has_critical ? 'مكتمل — حرج' : 'مكتمل'}</Badge>}
                        {o.status === 'cancelled' && <Badge tone="muted">ملغى</Badge>}
                        {o.status === 'pending' && o.rejection_note && <div className="text-xs mt-1" style={{ color: C.critical, maxWidth: 180 }}>أُرجعت: {o.rejection_note}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {o.status === 'pending' && <><button onClick={() => { setActiveOrderId(o.id); setView('results'); }} className="text-xs font-bold" style={{ color: C.accent }}>إدخال النتائج</button>{isManager && <button onClick={() => onCancel(o)} className="text-xs font-bold" style={{ color: C.critical }}>إلغاء</button>}</>}
                          {o.status === 'pending_review' && (canVerify
                            ? <><button onClick={() => onVerify(o)} className="text-xs font-bold" style={{ color: C.normal }}>اعتماد</button><button onClick={() => setRejectingOrder(o)} className="text-xs font-bold" style={{ color: C.critical }}>إرجاع</button></>
                            : <span className="text-xs" style={{ color: C.inkFaint }}>بانتظار الاعتماد</span>)}
                          {o.status === 'completed' && <button onClick={() => { setActiveOrderId(o.id); setView('report'); }} className="text-xs font-bold" style={{ color: C.accent }}>التقرير</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && <tr><td colSpan={5}><EmptyState text="لا توجد طلبات مطابقة" /></td></tr>}
              </tbody>
            </table>
            <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
          </div>
        </div>
      )}
      <RejectDialog order={rejectingOrder} onCancel={() => setRejectingOrder(null)} onConfirm={(reason) => { actions.rejectResults(rejectingOrder.id, rejectingOrder.sample_id, reason); setRejectingOrder(null); }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results entry
// ---------------------------------------------------------------------------
function ResultsEntryView({ order, patient, catalog, actions, setView }) {
  const [values, setValues] = useState(() => order ? Object.fromEntries(order.test_ids.map((id) => [id, ''])) : {});
  const [busy, setBusy] = useState(false);
  if (!order) return <div className="p-6"><EmptyState text="لم يتم تحديد طلب" /></div>;

  const tests = order.test_ids.map((id) => catalog.find((c) => c.id === id)).filter(Boolean);
  const allFilled = tests.every((t) => values[t.id] !== '' && !isNaN(Number(values[t.id])) && Number(values[t.id]) >= 0);
  const anyCritical = tests.some((t) => {
    const v = values[t.id];
    if (v === '' || isNaN(Number(v))) return false;
    return classifyValue(Number(v), resolveTestRanges(t, patient)) === 'critical';
  });

  const save = async () => {
    if (!allFilled) return;
    setBusy(true);
    const numeric = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v)]));
    await actions.submitResults(order.id, numeric, anyCritical, order.sample_id);
    setBusy(false);
    setView('orders');
  };

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => setView('orders')} className="text-sm font-bold" style={{ color: C.accent }}>‹ رجوع للطلبات</button>
      <div>
        <div className="text-2xl font-bold" style={{ color: C.ink }}>إدخال النتائج</div>
        <div className="text-sm font-mono" style={{ color: C.inkMuted }}>{patient?.name} · {order.sample_id}</div>
      </div>
      {order.rejection_note && <div className="px-4 py-3 rounded-lg text-sm" style={{ background: C.warningSoft, color: C.warning }}><span className="font-bold">أُرجع هذا الطلب من المدير لإعادة الإدخال: </span>{order.rejection_note}</div>}
      {anyCritical && <div className="px-4 py-3 rounded-lg text-sm font-bold" style={{ background: C.criticalDeepSoft, color: C.criticalDeep }}>⚠ توجد قيمة حرجة ضمن هذه النتائج — يُرجى التأكد منها قبل الحفظ</div>}
      <div className="rounded-lg" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        {tests.map((t, idx) => {
          const v = values[t.id]; const num = Number(v); const showGauge = v !== '' && !isNaN(num);
          const r = resolveTestRanges(t, patient);
          return (
            <div key={t.id} className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-center" style={{ borderBottom: idx < tests.length - 1 ? `1px solid ${C.line}` : 'none' }}>
              <div className="col-span-2 md:col-span-1"><div className="font-bold text-sm" style={{ color: C.ink }}>{t.name}</div><div className="text-xs font-mono" style={{ color: C.inkMuted }}>المعدل: <bdi dir="ltr">{r.min}–{r.max} {t.unit}</bdi></div></div>
              <input type="number" step="any" min="0" value={v} onChange={(e) => setValues({ ...values, [t.id]: e.target.value })} placeholder="القيمة" className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} />
              <div>{showGauge && <RangeGauge value={num} min={r.min} max={r.max} critLow={r.critLow} critHigh={r.critHigh} />}</div>
              <div>{showGauge && <Flag value={num} min={r.min} max={r.max} critLow={r.critLow} critHigh={r.critHigh} />}</div>
            </div>
          );
        })}
      </div>
      <button onClick={save} disabled={!allFilled || busy} className="px-5 py-2.5 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff', opacity: allFilled && !busy ? 1 : 0.4 }}>{busy ? '...جارِ الحفظ' : 'إرسال النتائج للمراجعة'}</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
function ReportView({ order, patient, catalog, setView, labSettings }) {
  if (!order) return <div className="p-6"><EmptyState text="لم يتم تحديد طلب" /></div>;
  if (order.status !== 'completed') {
    return (
      <div className="p-6 space-y-4">
        <button onClick={() => setView('orders')} className="text-sm font-bold" style={{ color: C.accent }}>‹ رجوع للطلبات</button>
        <EmptyState text="التقرير غير متاح للطباعة بعد — بانتظار اعتماد المدير للنتائج" />
      </div>
    );
  }
  const tests = order.test_ids.map((id) => catalog.find((c) => c.id === id)).filter(Boolean);
  const labName = labSettings?.name || 'مختبر الشموخ';
  const logoSrc = labSettings?.logo_b64 || LOGO_B64;
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between no-print flex-wrap gap-3">
        <button onClick={() => setView('orders')} className="text-sm font-bold" style={{ color: C.accent }}>‹ رجوع للطلبات</button>
        <button onClick={() => window.print()} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>طباعة التقرير</button>
      </div>
      {order.has_critical && <div className="px-4 py-3 rounded-lg text-sm font-bold" style={{ background: C.criticalDeepSoft, color: C.criticalDeep }}>ℹ تحتوي بعض نتائج هذا التقرير على قيم تستدعي المراجعة — يُنصح بمراجعة الطبيب المختص في أقرب وقت</div>}
      <div id="report-area" className="printable-area rounded-lg p-5 md:p-8 overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 mb-4" style={{ borderBottom: `2px solid ${C.ink}` }}>
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="شعار المختبر" style={{ height: 48, width: "auto" }} />
            <div>
              <div className="text-xl font-bold" style={{ color: C.ink }}>{labName}</div>
              <div className="text-xs" style={{ color: C.inkMuted }}>تقرير نتائج التحاليل المخبرية</div>
              <div className="text-xs font-mono mt-0.5" style={{ color: C.inkMuted }}>
                {[labSettings?.phone, labSettings?.email, labSettings?.address].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <div className="text-left text-xs font-mono" style={{ color: C.inkMuted }}>
            <div>رقم العينة: {order.sample_id}</div>
            <div>التاريخ: {fmtDate(order.created_at)}</div>
            {order.entered_by_name && <div>أُدخلت بواسطة: {order.entered_by_name}</div>}
            {order.verified_by_name && <div>اعتمدت بواسطة: {order.verified_by_name}</div>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6 text-sm">
          <div><span style={{ color: C.inkMuted }}>اسم المريض: </span><span className="font-bold" style={{ color: C.ink }}>{patient?.name}</span></div>
          <div><span style={{ color: C.inkMuted }}>العمر: </span><span className="font-bold font-mono" style={{ color: C.ink }}>{patient?.age}</span></div>
          <div><span style={{ color: C.inkMuted }}>الجنس: </span><span className="font-bold" style={{ color: C.ink }}>{patient?.gender}</span></div>
          {order.referring_doctor && <div><span style={{ color: C.inkMuted }}>الطبيب المحوّل: </span><span className="font-bold" style={{ color: C.ink }}>د. {order.referring_doctor}</span></div>}
        </div>

        {groupByCategory(tests).map(([cat, catTests]) => (
          <div key={cat} className="mb-6" style={{ breakInside: 'avoid' }}>
            <div className="text-sm font-bold px-3 py-1.5 mb-1 rounded" style={{ background: C.accentSoft, color: C.accentDark }}>{cat}</div>
            <table className="w-full text-sm min-w-[560px]">
              <thead><tr style={{ borderBottom: `1px solid ${C.ink}` }}>
                <th className="text-right py-2 font-bold" style={{ color: C.ink }}>الفحص</th>
                <th className="text-right py-2 font-bold" style={{ color: C.ink }}>النتيجة</th>
                <th className="text-right py-2 font-bold" style={{ color: C.ink }}>المعدل الطبيعي</th>
                <th className="text-right py-2 font-bold" style={{ color: C.ink }}>المؤشر</th>
                <th className="text-right py-2 font-bold" style={{ color: C.ink }}>الحالة</th>
              </tr></thead>
              <tbody>
                {catTests.map((t) => {
                  const value = order.results[t.id];
                  const r = resolveTestRanges(t, patient);
                  const status = classifyValue(value, r);
                  const rowBg = status === 'critical' ? C.criticalDeepSoft : status === 'abnormal' ? C.criticalSoft : 'transparent';
                  return (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${C.line}`, background: rowBg }}>
                      <td className="py-2.5" style={{ color: C.ink }}>{t.name}</td>
                      <td className="py-2.5 font-mono font-bold" style={{ color: status !== 'normal' ? C.critical : C.ink }}>{value} {t.unit}</td>
                      <td className="py-2.5 font-mono text-xs" style={{ color: C.inkMuted }}><bdi dir="ltr">{r.min}–{r.max} {t.unit}</bdi></td>
                      <td className="py-2.5 w-28"><RangeGauge value={value} min={r.min} max={r.max} critLow={r.critLow} critHigh={r.critHigh} /></td>
                      <td className="py-2.5"><ReportFlag value={value} min={r.min} max={r.max} critLow={r.critLow} critHigh={r.critHigh} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        <div className="mt-2 pt-3 text-[11px] flex flex-wrap gap-x-5 gap-y-1" style={{ borderTop: `1px solid ${C.line}`, color: C.inkFaint }}>
          <span>✓ ضمن المعدل الطبيعي</span>
          <span style={{ color: C.critical }}>↑ / ↓ خارج المعدل المرجعي</span>
          <span style={{ color: C.criticalDeep }}>⇑ / ⇓ يستدعي مراجعة الطبيب</span>
        </div>
        <div className="mt-4 pt-4 text-xs text-center" style={{ borderTop: `1px solid ${C.line}`, color: C.inkFaint }}>{labSettings?.report_footer || 'هذا التقرير صادر إلكترونياً من نظام إدارة المختبر ولا يغني عن استشارة الطبيب المعالج'}</div>
        {labSettings?.portal_url && <div className="mt-2 text-xs text-center font-mono" style={{ color: C.inkFaint }}>يمكن الاستعلام عن النتائج لاحقاً عبر: {labSettings.portal_url}</div>}
      </div>
    </div>
  );
}
