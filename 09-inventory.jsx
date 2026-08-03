// المخزون (كتابة العناصر مقيّدة للمدير فقط، مطابقةً لصلاحيات قاعدة البيانات)

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
function InventoryView({ inventory, catalog, actions, askConfirm, isManager, can, pendingAction, clearPendingAction }) {
  const canManage = isManager || (can && can('manage_inventory'));
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    if (pendingAction === 'new-inventory' && canManage) { setShowForm(true); clearPendingAction(); }
  }, [pendingAction]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', unit: '', quantity: '', threshold: '', expiry: '' });
  const [error, setError] = useState('');
  const { page, setPage, totalPages, pageItems } = usePagination(inventory, 6);

  const resetForm = () => { setForm({ name: '', unit: '', quantity: '', threshold: '', expiry: '' }); setEditingId(null); setShowForm(false); setError(''); };
  const startEdit = (item) => { setEditingId(item.id); setForm({ name: item.name, unit: item.unit, quantity: String(item.quantity), threshold: String(item.threshold), expiry: item.expiry_date || '' }); setShowForm(true); setError(''); };

  const submit = async () => {
    if (!form.name.trim()) { setError('اسم الصنف مطلوب'); return; }
    const quantity = Number(form.quantity), threshold = Number(form.threshold);
    if (isNaN(quantity) || quantity < 0) { setError('الكمية يجب أن تكون رقماً موجباً'); return; }
    if (isNaN(threshold) || threshold < 0) { setError('حد التنبيه يجب أن يكون رقماً موجباً'); return; }
    const payload = { name: form.name.trim(), unit: form.unit.trim() || 'قطعة', quantity, threshold, expiry_date: form.expiry || null };
    if (editingId) await actions.updateInventory(editingId, payload); else await actions.addInventory(payload);
    resetForm();
  };

  const onDelete = (item) => {
    const used = catalog.some((c) => c.consumes_item_id === item.id);
    if (used) { setError(`لا يمكن حذف "${item.name}" — مرتبط بفحص في الإعدادات`); return; }
    askConfirm({ title: 'حذف صنف', message: `هل تريد حذف "${item.name}"؟`, danger: true, onConfirm: () => actions.deleteInventory(item.id, item.name) });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-2xl font-bold" style={{ color: C.ink }}>المخزون</div>
        {canManage && <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>+ صنف جديد</button>}
      </div>
      {showForm && canManage && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Field label="اسم الصنف"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
            <Field label="الوحدة"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
            <Field label="الكمية"><input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="حد التنبيه"><input type="number" min="0" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="تاريخ الصلاحية (اختياري)"><input type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex gap-2">
            <button onClick={submit} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>{editingId ? 'حفظ التعديلات' : 'حفظ'}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
          </div>
        </div>
      )}
      {!showForm && <ErrorNote>{error}</ErrorNote>}
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الصنف</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الكمية</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الحالة</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الصلاحية</th>
            <th></th>
          </tr></thead>
          <tbody>
            {pageItems.map((item) => {
              const low = item.quantity <= item.threshold;
              const exp = expiryStatus(item.expiry_date);
              return (
                <tr key={item.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: C.ink }}>{item.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canManage
                      ? <input type="number" min="0" value={item.quantity} onChange={(e) => actions.setQuantity(item.id, item.name, Math.max(0, Number(e.target.value)))} className="w-20 px-2 py-1 rounded-md text-sm font-mono" style={inputStyle} />
                      : <span className="font-mono font-bold" style={{ color: C.ink }}>{item.quantity}</span>}
                    <span className="text-xs" style={{ color: C.inkMuted }}> {item.unit}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{low ? <Badge tone="critical">منخفض</Badge> : <Badge tone="normal">متوفر</Badge>}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {!exp && <span className="text-xs" style={{ color: C.inkFaint }}>—</span>}
                    {exp && exp.level === 'expired' && <Badge tone="critical">منتهي منذ {Math.abs(exp.days)} يوم</Badge>}
                    {exp && exp.level === 'soon' && <Badge tone="warning">ينتهي خلال {exp.days} يوم</Badge>}
                    {exp && exp.level === 'ok' && <span className="text-xs font-mono" style={{ color: C.inkMuted }}>{fmtDate(item.expiry_date)}</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {canManage && <button onClick={() => startEdit(item)} className="text-xs font-bold" style={{ color: C.accent }}>تعديل</button>}
                      {canManage && <button onClick={() => onDelete(item)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
}
