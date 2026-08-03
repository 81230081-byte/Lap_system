// ضبط الجودة (QC): تسجيل فحص العيّنات المرجعية اليومي والتحقق من دقة الأجهزة

// ---------------------------------------------------------------------------
// Quality Control
// ---------------------------------------------------------------------------
function QCView({ qc, displayName, actions, isManager, can, askConfirm, pendingAction, clearPendingAction }) {
  const canDelete = isManager || (can && can('delete_qc'));
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    if (pendingAction === 'new-qc') { setShowForm(true); clearPendingAction(); }
  }, [pendingAction]);
  const [query, setQuery] = useState('');
  const [filterResult, setFilterResult] = useState('all'); // all | passed | failed
  const [form, setForm] = useState({ item_name: '', level: '', expected_min: '', expected_max: '', result: '', notes: '' });
  const [manualPassed, setManualPassed] = useState(null); // used only when no expected range is given
  const [error, setError] = useState('');

  const knownItems = [...new Set(qc.map((q) => q.item_name))];

  const hasRange = form.expected_min !== '' && form.expected_max !== '';
  const autoPassed = hasRange && form.result !== '' ? (Number(form.result) >= Number(form.expected_min) && Number(form.result) <= Number(form.expected_max)) : null;

  const resetForm = () => { setForm({ item_name: '', level: '', expected_min: '', expected_max: '', result: '', notes: '' }); setManualPassed(null); setShowForm(false); setError(''); };

  const submit = async () => {
    if (!form.item_name.trim()) { setError('اسم الفحص/الجهاز مطلوب'); return; }
    if (form.result === '' || isNaN(Number(form.result))) { setError('النتيجة رقم مطلوب'); return; }
    if (hasRange && Number(form.expected_min) > Number(form.expected_max)) { setError('الحد الأدنى المتوقع أكبر من الحد الأقصى'); return; }
    const passed = hasRange ? autoPassed : manualPassed;
    if (passed === null) { setError('حدّد المدى المتوقع، أو اختر النتيجة (نجح/فشل) يدوياً'); return; }
    setError('');
    await actions.addQualityCheck({
      item_name: form.item_name.trim(),
      level: form.level.trim() || null,
      expected_min: hasRange ? Number(form.expected_min) : null,
      expected_max: hasRange ? Number(form.expected_max) : null,
      result: Number(form.result),
      passed,
      checked_by_name: displayName,
      notes: form.notes.trim() || null,
    });
    resetForm();
  };

  const onDelete = (q) => {
    askConfirm({ title: 'حذف فحص جودة', message: `هل تريد حذف سجل فحص "${q.item_name}" نهائياً؟`, danger: true, onConfirm: () => actions.deleteQualityCheck(q.id, q.item_name) });
  };

  const filtered = qc
    .filter((q) => (q.item_name || '').includes(query))
    .filter((q) => filterResult === 'all' || (filterResult === 'passed' ? q.passed : !q.passed))
    .sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
  const { page, setPage, totalPages, pageItems } = usePagination(filtered, 10, query + filterResult);

  const recentFail = qc.slice().sort((x, y) => new Date(y.created_at) - new Date(x.created_at))[0];
  const showFailBanner = recentFail && !recentFail.passed;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-2xl font-bold" style={{ color: C.ink }}>ضبط الجودة <span className="text-sm font-normal" style={{ color: C.inkMuted }}>({qc.length})</span></div>
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>+ تسجيل فحص جودة</button>
      </div>

      {showFailBanner && (
        <div className="rounded-lg px-4 py-3 text-sm font-bold" style={{ background: C.criticalSoft, color: C.critical }}>
          ⚠ آخر فحص جودة مسجّل ("{recentFail.item_name}") لم يجتز المعيار المتوقع — يُنصح بمراجعة الجهاز قبل اعتماد نتائج المرضى.
        </div>
      )}

      {showForm && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="اسم الفحص/الجهاز">
              <input list="qc-items" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} placeholder="مثال: جهاز السكر" />
              <datalist id="qc-items">{knownItems.map((n) => <option key={n} value={n} />)}</datalist>
            </Field>
            <Field label="المستوى (اختياري)"><input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} placeholder="مثال: طبيعي" /></Field>
            <Field label="الحد الأدنى المتوقع (اختياري)"><input type="number" value={form.expected_min} onChange={(e) => setForm({ ...form, expected_min: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="الحد الأقصى المتوقع (اختياري)"><input type="number" value={form.expected_max} onChange={(e) => setForm({ ...form, expected_max: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="النتيجة الفعلية"><input type="number" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="ملاحظات (اختياري)"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
          </div>

          {hasRange && form.result !== '' && (
            <div className="text-sm font-bold" style={{ color: autoPassed ? C.normal : C.critical }}>
              {autoPassed ? '✓ ضمن المدى المتوقع — سيُسجَّل كفحص ناجح' : '⚠ خارج المدى المتوقع — سيُسجَّل كفحص فاشل'}
            </div>
          )}
          {!hasRange && (
            <Field label="نتيجة الفحص (بما أن المدى المتوقع غير محدد)">
              <div className="flex gap-2">
                <button onClick={() => setManualPassed(true)} className="px-3.5 py-2 rounded-md text-sm font-bold" style={{ background: manualPassed === true ? C.normal : C.muted, color: manualPassed === true ? '#fff' : C.inkMuted }}>ناجح</button>
                <button onClick={() => setManualPassed(false)} className="px-3.5 py-2 rounded-md text-sm font-bold" style={{ background: manualPassed === false ? C.critical : C.muted, color: manualPassed === false ? '#fff' : C.inkMuted }}>فاشل</button>
              </div>
            </Field>
          )}

          <ErrorNote>{error}</ErrorNote>
          <div className="flex gap-2">
            <button onClick={submit} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>حفظ الفحص</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
          </div>
        </div>
      )}
      {!showForm && <ErrorNote>{error}</ErrorNote>}

      <div className="flex items-center gap-3 flex-wrap">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث باسم الفحص/الجهاز..." className="flex-1 min-w-[200px] px-3 py-2.5 rounded-lg text-sm" style={{ ...inputStyle, background: C.surface }} />
        <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} className="px-3 py-2.5 rounded-lg text-sm" style={{ ...inputStyle, background: C.surface }}>
          <option value="all">كل النتائج</option>
          <option value="passed">الناجحة فقط</option>
          <option value="failed">الفاشلة فقط</option>
        </select>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        {pageItems.length === 0 ? <EmptyState text="لا توجد فحوصات جودة مسجّلة" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>التاريخ</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>الفحص/الجهاز</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>المستوى</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>المدى المتوقع</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>النتيجة</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>الحالة</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>سجّله</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((q) => (
                <tr key={q.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-3 whitespace-nowrap font-mono" style={{ color: C.ink }}>{fmtDateTime(q.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-bold" style={{ color: C.ink }}>{q.item_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: C.inkMuted }}>{q.level || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono" style={{ color: C.inkMuted }}>{q.expected_min != null && q.expected_max != null ? `${q.expected_min} – ${q.expected_max}` : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono font-bold" style={{ color: C.ink }}>{q.result}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge tone={q.passed ? 'normal' : 'critical'}>{q.passed ? 'ناجح' : 'فاشل'}</Badge></td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: C.inkMuted }}>{q.checked_by_name || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canDelete && <button onClick={() => onDelete(q)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
}
