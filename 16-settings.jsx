// الإعدادات: كتالوج الفحوصات، بيانات المختبر، إدارة الموظفين

// ---------------------------------------------------------------------------
function TestsTab({ catalog, inventory, orders, actions, askConfirm, isManager }) {
  const blank = { name: '', category: '', unit: '', min: '', max: '', price: '', differentForFemale: false, minF: '', maxF: '', criticalLow: '', criticalHigh: '', consumesItemId: '', consumesQty: '1' };
  const existingCategories = [...new Set(catalog.map((c) => c.category || 'Other'))].sort();
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const resetForm = () => { setForm(blank); setEditingId(null); setError(''); };
  const startEdit = (t) => {
    setEditingId(t.id);
    setForm({
      name: t.name, category: t.category || 'Other', unit: t.unit || '', min: String(t.min), max: String(t.max), price: String(t.price),
      differentForFemale: t.min_female !== null && t.min_female !== undefined,
      minF: t.min_female !== null && t.min_female !== undefined ? String(t.min_female) : '',
      maxF: t.max_female !== null && t.max_female !== undefined ? String(t.max_female) : '',
      criticalLow: t.critical_low !== null && t.critical_low !== undefined ? String(t.critical_low) : '',
      criticalHigh: t.critical_high !== null && t.critical_high !== undefined ? String(t.critical_high) : '',
      consumesItemId: t.consumes_item_id || '', consumesQty: t.consumes_qty ? String(t.consumes_qty) : '1',
    });
    setError('');
  };

  const submit = async () => {
    if (!form.name.trim()) { setError('اسم الفحص مطلوب'); return; }
    if (!form.category.trim()) { setError('فئة الفحص مطلوبة (مثال: Hematology (CBC))'); return; }
    const min = Number(form.min), max = Number(form.max), price = Number(form.price);
    if (isNaN(min) || isNaN(max) || min >= max) { setError('يجب أن يكون الحد الأدنى أصغر من الحد الأقصى'); return; }
    if (isNaN(price) || price < 0) { setError('السعر يجب أن يكون رقماً موجباً'); return; }
    const payload = {
      name: form.name.trim(), category: form.category.trim(), unit: form.unit.trim(), min, max, price,
      min_female: form.differentForFemale ? Number(form.minF || min) : null,
      max_female: form.differentForFemale ? Number(form.maxF || max) : null,
      critical_low: form.criticalLow !== '' ? Number(form.criticalLow) : null,
      critical_high: form.criticalHigh !== '' ? Number(form.criticalHigh) : null,
      consumes_item_id: form.consumesItemId || null,
      consumes_qty: form.consumesItemId ? Number(form.consumesQty) || 1 : null,
    };
    if (editingId) await actions.updateTest(editingId, payload); else await actions.addTest(payload);
    resetForm();
  };

  const onDelete = (t) => {
    const used = orders.some((o) => o.test_ids.includes(t.id));
    if (used) { setError(`لا يمكن حذف "${t.name}" — مستخدم في طلبات موجودة`); return; }
    askConfirm({ title: 'حذف فحص', message: `هل تريد حذف "${t.name}"؟`, danger: true, onConfirm: () => actions.deleteTest(t.id, t.name) });
  };

  return (
    <div className="space-y-5">
      {isManager && <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Field label="اسم الفحص"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
          <Field label="الفئة (Category)">
            <input list="test-categories-list" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Hematology (CBC)..." className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} />
            <datalist id="test-categories-list">{existingCategories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="الوحدة"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
          <Field label="الحد الأدنى"><input type="number" step="any" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
          <Field label="الحد الأقصى"><input type="number" step="any" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
          <Field label="السعر"><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ color: C.ink }}><input type="checkbox" checked={form.differentForFemale} onChange={(e) => setForm({ ...form, differentForFemale: e.target.checked })} /> معدل مختلف للإناث</label>
        {form.differentForFemale && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="الحد الأدنى (أنثى)"><input type="number" step="any" value={form.minF} onChange={(e) => setForm({ ...form, minF: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="الحد الأقصى (أنثى)"><input type="number" step="any" value={form.maxF} onChange={(e) => setForm({ ...form, maxF: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="الحد الحرج الأدنى (اختياري)"><input type="number" step="any" value={form.criticalLow} onChange={(e) => setForm({ ...form, criticalLow: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
          <Field label="الحد الحرج الأعلى (اختياري)"><input type="number" step="any" value={form.criticalHigh} onChange={(e) => setForm({ ...form, criticalHigh: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="يستهلك من المخزون (اختياري)">
            <select value={form.consumesItemId} onChange={(e) => setForm({ ...form, consumesItemId: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
              <option value="">بدون</option>
              {inventory.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
          {form.consumesItemId && <Field label="الكمية المستهلكة لكل فحص"><input type="number" min="1" value={form.consumesQty} onChange={(e) => setForm({ ...form, consumesQty: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>}
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex gap-2">
          <button onClick={submit} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>{editingId ? 'حفظ التعديلات' : 'إضافة فحص'}</button>
          {editingId && <button onClick={resetForm} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>}
        </div>
      </div>}
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الفحص</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المعدل</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>السعر</th>
            <th></th>
          </tr></thead>
          <tbody>
            {groupByCategory(catalog).map(([cat, tests]) => (
              <React.Fragment key={cat}>
                <tr style={{ background: C.bg }}><td colSpan={4} className="px-4 py-2 text-xs font-bold" style={{ color: C.accentDark }}>{cat} <span style={{ color: C.inkMuted, fontWeight: 400 }}>({tests.length})</span></td></tr>
                {tests.map((c) => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: C.ink }}>{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.inkMuted }}>{c.min}–{c.max} {c.unit}{c.min_female !== null && c.min_female !== undefined ? ' (حسب الجنس)' : ''}</td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: C.ink }}>{SAR(c.price)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{isManager && <div className="flex items-center gap-3"><button onClick={() => startEdit(c)} className="text-xs font-bold" style={{ color: C.accent }}>تعديل</button><button onClick={() => onDelete(c)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button></div>}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lab info tab (general settings)
// ---------------------------------------------------------------------------
function LabInfoTab({ labSettings, actions, isManager }) {
  const blank = { name: '', phone: '', email: '', address: '', report_footer: '', logo_b64: '', portal_url: '' };
  const [form, setForm] = useState(blank);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      name: labSettings?.name || '', phone: labSettings?.phone || '', email: labSettings?.email || '',
      address: labSettings?.address || '', report_footer: labSettings?.report_footer || '', logo_b64: labSettings?.logo_b64 || '',
      portal_url: labSettings?.portal_url || '',
    });
  }, [labSettings]);

  const save = async () => {
    await actions.updateLabSettings({
      name: form.name.trim() || 'مختبر الشموخ', phone: form.phone.trim() || null, email: form.email.trim() || null,
      address: form.address.trim() || null, report_footer: form.report_footer.trim() || null, logo_b64: form.logo_b64.trim() || null,
      portal_url: form.portal_url.trim() || null,
    });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="اسم المختبر"><input disabled={!isManager} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
        <Field label="رقم الهاتف"><input disabled={!isManager} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        <Field label="البريد الإلكتروني"><input disabled={!isManager} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        <Field label="العنوان"><input disabled={!isManager} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
      </div>
      <Field label="ملاحظة أسفل التقرير المطبوع (اختياري)"><input disabled={!isManager} value={form.report_footer} onChange={(e) => setForm({ ...form, report_footer: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
      <Field label="رابط بوابة استعلام المريض عن نتيجته (اختياري — يظهر أسفل التقرير المطبوع إن أُدخل)"><input disabled={!isManager} value={form.portal_url} onChange={(e) => setForm({ ...form, portal_url: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} placeholder="https://.../portal.html" /></Field>
      {isManager && (
        <Field label="شعار المختبر (الصق Base64 أو رابط صورة — اتركه فارغاً لاستخدام الشعار الافتراضي)">
          <textarea value={form.logo_b64} onChange={(e) => setForm({ ...form, logo_b64: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-md text-xs font-mono" style={inputStyle} placeholder="data:image/png;base64,... أو https://..." />
        </Field>
      )}
      {isManager
        ? <button onClick={save} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>{saved ? '✓ تم الحفظ' : 'حفظ'}</button>
        : <div className="text-xs" style={{ color: C.inkFaint }}>عرض فقط — التعديل متاح للمدير</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staff tab (manager only)
// ---------------------------------------------------------------------------
function StaffTab({ staff, actions, myId }) {
  const [error, setError] = useState('');

  const changeRole = (p, newRole) => {
    if (p.id === myId) { setError('لا يمكنك تغيير صلاحيتك الخاصة'); return; }
    setError('');
    actions.updateStaffRole(p.id, p.display_name, newRole);
  };
  const toggleActive = (p) => {
    if (p.id === myId) { setError('لا يمكنك تعطيل حسابك الخاص'); return; }
    setError('');
    actions.updateStaffActive(p.id, p.display_name, !(p.active !== false));
  };

  return (
    <div className="space-y-3">
      <div className="text-xs px-1" style={{ color: C.inkMuted }}>لإضافة موظف جديد: لوحة Supabase ← Authentication ← Add User، ثم حدّد صلاحيته من هذه الشاشة.</div>
      <ErrorNote>{error}</ErrorNote>
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الاسم</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الصلاحية</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الحالة</th>
            <th></th>
          </tr></thead>
          <tbody>
            {staff.map((p) => {
              const isActive = p.active !== false;
              const isSelf = p.id === myId;
              return (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: C.ink }}>{p.display_name}{isSelf && <span className="text-xs font-normal" style={{ color: C.inkMuted }}> (أنت)</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select value={p.role} disabled={isSelf} onChange={(e) => changeRole(p, e.target.value)} className="px-2 py-1.5 rounded-md text-sm" style={{ ...inputStyle, opacity: isSelf ? 0.5 : 1 }}>
                      <option value="فني مختبر">فني مختبر</option>
                      <option value="مدير">مدير</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{isActive ? <Badge tone="normal">نشط</Badge> : <Badge tone="critical">معطّل</Badge>}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => toggleActive(p)} disabled={isSelf} className="text-xs font-bold" style={{ color: isActive ? C.critical : C.normal, opacity: isSelf ? 0.4 : 1 }}>{isActive ? 'تعطيل' : 'تفعيل'}</button>
                  </td>
                </tr>
              );
            })}
            {staff.length === 0 && <tr><td colSpan={4}><EmptyState text="لا يوجد موظفون بعد" /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings (tabbed: tests / lab info / staff)
// ---------------------------------------------------------------------------
function SettingsView({ catalog, inventory, orders, actions, askConfirm, isManager, staff, myId, labSettings }) {
  const [tab, setTab] = useState('tests');
  const tabs = [
    { key: 'tests', label: 'الفحوصات' },
    { key: 'lab', label: 'بيانات المختبر' },
    ...(isManager ? [{ key: 'staff', label: 'الموظفون' }] : []),
  ];
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-2xl font-bold" style={{ color: C.ink }}>الإعدادات</div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className="px-4 py-2 text-sm font-bold" style={{ background: tab === t.key ? C.accent : C.surface, color: tab === t.key ? '#fff' : C.inkMuted }}>{t.label}</button>
          ))}
        </div>
      </div>
      {tab === 'tests' && <TestsTab catalog={catalog} inventory={inventory} orders={orders} actions={actions} askConfirm={askConfirm} isManager={isManager} />}
      {tab === 'lab' && <LabInfoTab labSettings={labSettings} actions={actions} isManager={isManager} />}
      {tab === 'staff' && isManager && <StaffTab staff={staff} actions={actions} myId={myId} />}
    </div>
  );
}
