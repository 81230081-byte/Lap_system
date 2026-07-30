// إدارة المرضى + سجل الفحوصات التاريخي لكل مريض

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------
function PatientsView({ patients, orders, actions, askConfirm, onViewOrders, onViewHistory, isManager }) {
  const [showForm, setShowForm] = useState(false);
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
                    <button onClick={() => startEdit(p)} className="text-xs font-bold" style={{ color: C.accent }}>تعديل</button>
                    {isManager && <button onClick={() => onDelete(p)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button>}
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
function PatientHistoryView({ patient, orders, catalog, setView }) {
  if (!patient) return <div className="p-6"><EmptyState text="لم يتم تحديد مريض" /></div>;
  const completed = orders.filter((o) => o.patient_id === patient.id && o.status === 'completed').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const byTest = {};
  completed.forEach((o) => {
    Object.entries(o.results || {}).forEach(([testId, value]) => {
      if (!byTest[testId]) byTest[testId] = [];
      byTest[testId].push({ date: o.created_at, value, sampleId: o.sample_id });
    });
  });
  const testIds = Object.keys(byTest);

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => setView('patients')} className="text-sm font-bold" style={{ color: C.accent }}>‹ رجوع للمرضى</button>
      <div>
        <div className="text-2xl font-bold" style={{ color: C.ink }}>السجل التاريخي — {patient.name}</div>
        <div className="text-sm" style={{ color: C.inkMuted }}>{completed.length} طلب مكتمل</div>
      </div>
      {testIds.length === 0 ? (
        <EmptyState text="لا يوجد سجل نتائج سابق لهذا المريض" />
      ) : (
        <div className="space-y-4">
          {testIds.map((testId) => {
            const test = catalog.find((c) => c.id === testId);
            if (!test) return null;
            const points = byTest[testId];
            const r = resolveTestRanges(test, patient);
            return (
              <div key={testId} className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                <div className="font-bold text-sm mb-3" style={{ color: C.ink }}>
                  {test.name} <span className="font-normal text-xs" style={{ color: C.inkMuted }}>({r.min}–{r.max} {test.unit})</span>
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
  );
}
