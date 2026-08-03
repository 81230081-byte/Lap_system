// حجز المواعيد

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
const APPT_STATUS_LABEL = { scheduled: 'مجدوَل', arrived: 'وصل', completed: 'اكتمل', cancelled: 'ملغى', no_show: 'لم يحضر' };
const APPT_STATUS_TONE = { scheduled: 'accent', arrived: 'warning', completed: 'normal', cancelled: 'muted', no_show: 'critical' };

function AppointmentsView({ appointments, patients, actions, askConfirm, isManager, can, onCreateOrder, pendingAction, clearPendingAction }) {
  const canDelete = isManager || (can && can('delete_appointments'));
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    if (pendingAction === 'new-appointment') { setShowForm(true); clearPendingAction(); }
  }, [pendingAction]);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('upcoming');
  const [form, setForm] = useState({ patient_id: '', patient_name: '', phone: '', date: '', time: '', notes: '' });
  const [error, setError] = useState('');

  const resetForm = () => { setForm({ patient_id: '', patient_name: '', phone: '', date: '', time: '', notes: '' }); setShowForm(false); setError(''); };

  const pickPatient = (id) => {
    if (!id) { setForm({ ...form, patient_id: '', patient_name: '', phone: '' }); return; }
    const p = patients.find((x) => x.id === id);
    setForm({ ...form, patient_id: id, patient_name: p ? p.name : '', phone: p ? (p.phone || '') : '' });
  };

  const submit = async () => {
    if (!form.patient_name.trim()) { setError('اسم المريض مطلوب'); return; }
    if (!form.date || !form.time) { setError('التاريخ والوقت مطلوبان'); return; }
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) { setError('رقم الهاتف غير صالح'); return; }
    const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString();
    setError('');
    await actions.addAppointment({
      patient_id: form.patient_id || null,
      patient_name: form.patient_name.trim(),
      phone: form.phone.trim() || null,
      scheduled_at,
      notes: form.notes.trim() || null,
    });
    resetForm();
  };

  const onDelete = (a) => {
    askConfirm({ title: 'حذف موعد', message: `هل تريد حذف موعد "${a.patient_name}" نهائياً؟`, danger: true, onConfirm: () => actions.deleteAppointment(a.id, a.patient_name) });
  };

  const filtered = appointments
    .filter((a) => (a.patient_name || '').includes(query) || (a.phone || '').includes(query))
    .filter((a) => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'today') return new Date(a.scheduled_at).toDateString() === new Date().toDateString();
      return a.status === 'scheduled' || a.status === 'arrived';
    })
    .sort((x, y) => new Date(x.scheduled_at) - new Date(y.scheduled_at));
  const { page, setPage, totalPages, pageItems } = usePagination(filtered, 8, query + filterStatus);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-2xl font-bold" style={{ color: C.ink }}>المواعيد <span className="text-sm font-normal" style={{ color: C.inkMuted }}>({appointments.length})</span></div>
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>+ موعد جديد</button>
      </div>

      {showForm && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="ربط بمريض مسجّل (اختياري)">
              <select value={form.patient_id} onChange={(e) => pickPatient(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                <option value="">— مريض جديد / غير مسجّل —</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="اسم المريض"><input value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
            <Field label="رقم الهاتف (اختياري)"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="التاريخ"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="الوقت"><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="ملاحظات (اختياري)"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex gap-2">
            <button onClick={submit} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>حفظ الموعد</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
          </div>
        </div>
      )}
      {!showForm && <ErrorNote>{error}</ErrorNote>}

      <div className="flex items-center gap-3 flex-wrap">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="flex-1 min-w-[200px] px-3 py-2.5 rounded-lg text-sm" style={{ ...inputStyle, background: C.surface }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 rounded-lg text-sm" style={{ ...inputStyle, background: C.surface }}>
          <option value="upcoming">القادمة والنشطة</option>
          <option value="today">اليوم</option>
          <option value="all">الكل</option>
        </select>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        {pageItems.length === 0 ? <EmptyState text="لا توجد مواعيد" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>الموعد</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>المريض</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>الهاتف</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>الحالة</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}>ملاحظات</th>
                <th className="px-4 py-3 text-right" style={{ color: C.inkMuted }}></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-3 whitespace-nowrap font-mono" style={{ color: C.ink }}>{fmtDateTime(a.scheduled_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-bold" style={{ color: C.ink }}>{a.patient_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono" style={{ color: C.inkMuted }}>{a.phone || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge tone={APPT_STATUS_TONE[a.status]}>{APPT_STATUS_LABEL[a.status] || a.status}</Badge></td>
                  <td className="px-4 py-3" style={{ color: C.inkMuted }}>{a.notes || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {a.status === 'scheduled' && <button onClick={() => actions.updateAppointment(a.id, { status: 'arrived' }, a.patient_name)} className="text-xs font-bold" style={{ color: C.accent }}>وصل</button>}
                      {a.status === 'scheduled' && <button onClick={() => actions.updateAppointment(a.id, { status: 'no_show' }, a.patient_name)} className="text-xs font-bold" style={{ color: C.warning }}>لم يحضر</button>}
                      {a.status === 'scheduled' && <button onClick={() => actions.updateAppointment(a.id, { status: 'cancelled' }, a.patient_name)} className="text-xs font-bold" style={{ color: C.critical }}>إلغاء</button>}
                      {a.status === 'arrived' && a.patient_id && <button onClick={() => onCreateOrder(a.patient_id)} className="text-xs font-bold" style={{ color: C.accent }}>إنشاء طلب</button>}
                      {a.status === 'arrived' && <button onClick={() => actions.updateAppointment(a.id, { status: 'completed' }, a.patient_name)} className="text-xs font-bold" style={{ color: C.normal }}>اكتمل</button>}
                      {canDelete && <button onClick={() => onDelete(a)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button>}
                    </div>
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
