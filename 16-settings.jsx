// الإعدادات: كتالوج الفحوصات، بيانات المختبر، إدارة الموظفين

// ---------------------------------------------------------------------------
function TestsTab({ catalog, inventory, orders, actions, askConfirm, isManager, can }) {
  const canManage = isManager || (can && can('manage_catalog'));
  const blank = { name: '', category: '', unit: '', min: '', max: '', price: '', differentForFemale: false, minF: '', maxF: '', criticalLow: '', criticalHigh: '', consumesItemId: '', consumesQty: '1', valueType: 'numeric', qualitativeAbnormal: '' };
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
      valueType: t.value_type || 'numeric', qualitativeAbnormal: t.qualitative_abnormal_value || '',
    });
    setError('');
  };

  const submit = async () => {
    if (!form.name.trim()) { setError('اسم الفحص مطلوب'); return; }
    if (!form.category.trim()) { setError('فئة الفحص مطلوبة (مثال: Hematology (CBC))'); return; }
    const price = Number(form.price);
    if (isNaN(price) || price < 0) { setError('السعر يجب أن يكون رقماً موجباً'); return; }
    let payload;
    if (form.valueType === 'qualitative') {
      payload = {
        name: form.name.trim(), category: form.category.trim(), unit: '', min: 0, max: 0, price,
        min_female: null, max_female: null, critical_low: null, critical_high: null,
        consumes_item_id: form.consumesItemId || null, consumes_qty: form.consumesItemId ? Number(form.consumesQty) || 1 : null,
        value_type: 'qualitative', qualitative_abnormal_value: form.qualitativeAbnormal || null,
      };
    } else {
      const min = Number(form.min), max = Number(form.max);
      if (isNaN(min) || isNaN(max) || min >= max) { setError('يجب أن يكون الحد الأدنى أصغر من الحد الأقصى'); return; }
      payload = {
        name: form.name.trim(), category: form.category.trim(), unit: form.unit.trim(), min, max, price,
        min_female: form.differentForFemale ? Number(form.minF || min) : null,
        max_female: form.differentForFemale ? Number(form.maxF || max) : null,
        critical_low: form.criticalLow !== '' ? Number(form.criticalLow) : null,
        critical_high: form.criticalHigh !== '' ? Number(form.criticalHigh) : null,
        consumes_item_id: form.consumesItemId || null,
        consumes_qty: form.consumesItemId ? Number(form.consumesQty) || 1 : null,
        value_type: 'numeric', qualitative_abnormal_value: null,
      };
    }
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
      {canManage && <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <Field label="نوع القيمة">
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm({ ...form, valueType: 'numeric' })} className="px-3.5 py-2 rounded-md text-sm font-bold" style={{ background: form.valueType === 'numeric' ? C.accent : C.bg, color: form.valueType === 'numeric' ? '#fff' : C.inkMuted, border: `1px solid ${form.valueType === 'numeric' ? C.accent : C.line}` }}>رقمي (بمعدل طبيعي)</button>
            <button type="button" onClick={() => setForm({ ...form, valueType: 'qualitative' })} className="px-3.5 py-2 rounded-md text-sm font-bold" style={{ background: form.valueType === 'qualitative' ? C.accent : C.bg, color: form.valueType === 'qualitative' ? '#fff' : C.inkMuted, border: `1px solid ${form.valueType === 'qualitative' ? C.accent : C.line}` }}>نوعي (إيجابي / سلبي)</button>
          </div>
        </Field>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Field label="اسم الفحص"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
          <Field label="الفئة (Category)">
            <input list="test-categories-list" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Hematology (CBC)..." className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} />
            <datalist id="test-categories-list">{existingCategories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          {form.valueType === 'numeric' && <Field label="الوحدة"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>}
          {form.valueType === 'numeric' && <Field label="الحد الأدنى"><input type="number" step="any" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>}
          {form.valueType === 'numeric' && <Field label="الحد الأقصى"><input type="number" step="any" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>}
          <Field label="السعر"><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        </div>
        {form.valueType === 'qualitative' && (
          <Field label="القيمة التي تُعتبر غير طبيعية (اختياري — لتمييزها في التقرير)">
            <select value={form.qualitativeAbnormal} onChange={(e) => setForm({ ...form, qualitativeAbnormal: e.target.value })} className="w-full max-w-xs px-3 py-2 rounded-md text-sm" style={inputStyle}>
              <option value="">بدون تمييز</option>
              <option value="Positive">إيجابي (Positive)</option>
              <option value="Negative">سلبي (Negative)</option>
            </select>
          </Field>
        )}
        {form.valueType === 'numeric' && (<>
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
        </>)}
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
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.inkMuted }}>
                      {c.value_type === 'qualitative'
                        ? <span>نوعي (إيجابي/سلبي){c.qualitative_abnormal_value ? ` — غير طبيعي: ${QUALITATIVE_LABEL[c.qualitative_abnormal_value]}` : ''}</span>
                        : <><bdi dir="ltr">{c.min}–{c.max} {c.unit}</bdi>{c.min_female !== null && c.min_female !== undefined ? ' (حسب الجنس)' : ''}</>}
                    </td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: C.ink }}>{SAR(c.price)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{canManage && <div className="flex items-center gap-3"><button onClick={() => startEdit(c)} className="text-xs font-bold" style={{ color: C.accent }}>تعديل</button><button onClick={() => onDelete(c)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button></div>}</td>
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
function LabInfoTab({ labSettings, actions, isManager, can }) {
  const canEdit = isManager || (can && can('manage_settings'));
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
        <Field label="اسم المختبر"><input disabled={!canEdit} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
        <Field label="رقم الهاتف"><input disabled={!canEdit} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        <Field label="البريد الإلكتروني"><input disabled={!canEdit} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        <Field label="العنوان"><input disabled={!canEdit} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
      </div>
      <Field label="ملاحظة أسفل التقرير المطبوع (اختياري)"><input disabled={!canEdit} value={form.report_footer} onChange={(e) => setForm({ ...form, report_footer: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
      <Field label="رابط بوابة استعلام المريض عن نتيجته (اختياري — يظهر أسفل التقرير المطبوع إن أُدخل)"><input disabled={!canEdit} value={form.portal_url} onChange={(e) => setForm({ ...form, portal_url: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} placeholder="https://.../portal.html" /></Field>
      {canEdit && (
        <Field label="شعار المختبر (الصق Base64 أو رابط صورة — اتركه فارغاً لاستخدام الشعار الافتراضي)">
          <textarea value={form.logo_b64} onChange={(e) => setForm({ ...form, logo_b64: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-md text-xs font-mono" style={inputStyle} placeholder="data:image/png;base64,... أو https://..." />
        </Field>
      )}
      {canEdit
        ? <button onClick={save} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>{saved ? '✓ تم الحفظ' : 'حفظ'}</button>
        : <div className="text-xs" style={{ color: C.inkFaint }}>عرض فقط — ليس لديك صلاحية التعديل</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users & Permissions tab
// ---------------------------------------------------------------------------
const PERMISSION_GROUPS = [
  { group: 'العمليات اليومية', items: [
    { key: 'verify_results', label: 'اعتماد / إرجاع نتائج الفحوصات' },
    { key: 'delete_patients', label: 'حذف مرضى' },
    { key: 'delete_appointments', label: 'حذف مواعيد' },
    { key: 'delete_qc', label: 'حذف فحوصات جودة' },
  ]},
  { group: 'المخزون والفحوصات والموردين', items: [
    { key: 'manage_inventory', label: 'إدارة المخزون (إضافة/تعديل/حذف)' },
    { key: 'manage_catalog', label: 'إدارة كتالوج الفحوصات' },
    { key: 'manage_suppliers', label: 'إدارة الموردين' },
    { key: 'manage_referring_doctors', label: 'إدارة الأطباء المحوّلين' },
  ]},
  { group: 'الأموال والتقارير', items: [
    { key: 'view_treasury', label: 'عرض الصناديق والبنوك والرواتب' },
    { key: 'manage_accounts', label: 'إدارة الصناديق والحسابات البنكية' },
    { key: 'view_financial_reports', label: 'عرض التقارير المالية' },
    { key: 'manage_coa', label: 'إدارة الشجرة المحاسبية' },
  ]},
  { group: 'الإدارة', items: [
    { key: 'manage_settings', label: 'تعديل بيانات المختبر' },
    { key: 'manage_users', label: 'إدارة المستخدمين والصلاحيات' },
  ]},
];
const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));
const PERMISSION_LABELS = Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])));

function NewUserForm({ actions }) {
  const blank = { email: '', password: '', display_name: '', role: 'فني مختبر' };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async () => {
    if (!form.display_name.trim()) { setError('اسم المستخدم مطلوب'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError('بريد إلكتروني غير صالح'); return; }
    if (form.password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return; }
    setError(''); setBusy(true);
    try {
      await actions.createUser(form.email.trim(), form.password, form.display_name.trim(), form.role);
      setForm(blank); setOpen(false);
    } catch (e) { /* toast already shown */ } finally { setBusy(false); }
  };

  if (!open) return <button onClick={() => setOpen(true)} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>+ مستخدم جديد</button>;

  return (
    <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="الاسم الكامل"><input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
        <Field label="البريد الإلكتروني"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        <Field label="كلمة المرور المبدئية"><input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} placeholder="6 أحرف على الأقل" /></Field>
        <Field label="الصلاحية الأساسية"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}><option value="فني مختبر">فني مختبر</option><option value="مدير">مدير</option></select></Field>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff', opacity: busy ? 0.6 : 1 }}>{busy ? '...جارِ الإنشاء' : 'إنشاء الحساب'}</button>
        <button onClick={() => { setOpen(false); setForm(blank); setError(''); }} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
      </div>
    </div>
  );
}

function UserPermissionsRow({ user, isSelf, userPerms, actions, askConfirm }) {
  const [expanded, setExpanded] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const isManagerRole = user.role === 'مدير';

  const toggle = (key, label) => {
    if (userPerms.has(key)) actions.revokePermission(user.id, user.display_name, key, label);
    else actions.grantPermission(user.id, user.display_name, key, label);
  };

  return (
    <>
      <tr style={{ borderBottom: `1px solid ${C.line}` }}>
        <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: C.ink }}>{user.display_name}{isSelf && <span className="text-xs font-normal" style={{ color: C.inkMuted }}> (أنت)</span>}</td>
        <td className="px-4 py-3 whitespace-nowrap">
          <select value={user.role} disabled={isSelf} onChange={(e) => actions.updateStaffRole(user.id, user.display_name, e.target.value)} className="px-2 py-1.5 rounded-md text-sm" style={{ ...inputStyle, opacity: isSelf ? 0.5 : 1 }}>
            <option value="فني مختبر">فني مختبر</option>
            <option value="مدير">مدير</option>
          </select>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">{user.active !== false ? <Badge tone="normal">نشط</Badge> : <Badge tone="critical">معطّل</Badge>}</td>
        <td className="px-4 py-3 whitespace-nowrap">{isManagerRole ? <span className="text-xs" style={{ color: C.inkFaint }}>كل الصلاحيات (مدير)</span> : <span className="text-xs font-mono" style={{ color: C.accent }}>{userPerms.size}</span>}</td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            {!isManagerRole && <button onClick={() => setExpanded(!expanded)} className="text-xs font-bold" style={{ color: C.accent }}>{expanded ? 'إخفاء الصلاحيات' : 'الصلاحيات التفصيلية'}</button>}
            <button onClick={() => setPwOpen(!pwOpen)} className="text-xs font-bold" style={{ color: C.accent }}>كلمة مرور جديدة</button>
            {!isSelf && (
              <button onClick={() => actions.updateStaffActive(user.id, user.display_name, !(user.active !== false))} className="text-xs font-bold" style={{ color: user.active !== false ? C.critical : C.normal }}>{user.active !== false ? 'تعطيل' : 'تفعيل'}</button>
            )}
            {!isSelf && (
              <button onClick={() => askConfirm({ title: 'حذف مستخدم', message: `هل تريد حذف حساب "${user.display_name}" نهائياً؟ لا يمكن التراجع.`, danger: true, onConfirm: () => actions.deleteUser(user.id, user.display_name) })} className="text-xs font-bold" style={{ color: C.critical }}>حذف الحساب</button>
            )}
          </div>
        </td>
      </tr>
      {pwOpen && (
        <tr style={{ background: C.bg }}><td colSpan={5} className="px-4 py-3">
          <div className="flex items-end gap-2">
            <Field label="كلمة المرور الجديدة"><input type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="w-56 px-3 py-2 rounded-md text-sm font-mono" style={{ ...inputStyle, background: C.surface }} /></Field>
            <button onClick={async () => { if (newPw.length >= 6) { await actions.resetUserPassword(user.id, newPw); setNewPw(''); setPwOpen(false); } }} className="px-3.5 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>حفظ</button>
            <button onClick={() => { setPwOpen(false); setNewPw(''); }} className="px-3.5 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
          </div>
        </td></tr>
      )}
      {expanded && !isManagerRole && (
        <tr style={{ background: C.bg }}><td colSpan={5} className="px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PERMISSION_GROUPS.map((g) => (
              <div key={g.group} className="rounded-md p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                <div className="text-xs font-bold mb-2" style={{ color: C.accentDark }}>{g.group}</div>
                <div className="space-y-1.5">
                  {g.items.map((it) => (
                    <label key={it.key} className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
                      <input type="checkbox" checked={userPerms.has(it.key)} onChange={() => toggle(it.key, it.label)} />
                      {it.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </td></tr>
      )}
    </>
  );
}

function UsersPermissionsTab({ staff, permissions, actions, myId, askConfirm }) {
  return (
    <div className="space-y-3">
      <NewUserForm actions={actions} />
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الاسم</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الصلاحية الأساسية</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الحالة</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>صلاحيات إضافية</th>
            <th></th>
          </tr></thead>
          <tbody>
            {staff.map((p) => (
              <UserPermissionsRow
                key={p.id}
                user={p}
                isSelf={p.id === myId}
                userPerms={new Set(permissions.filter((x) => x.user_id === p.id).map((x) => x.permission))}
                actions={actions}
                askConfirm={askConfirm}
              />
            ))}
            {staff.length === 0 && <tr><td colSpan={5}><EmptyState text="لا يوجد موظفون بعد" /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings (tabbed: tests / lab info / users & permissions)
// ---------------------------------------------------------------------------
function SettingsView({ catalog, inventory, orders, actions, askConfirm, isManager, can, staff, permissions, myId, labSettings }) {
  const [tab, setTab] = useState('tests');
  const canManageUsers = isManager || (can && can('manage_users'));
  const tabs = [
    { key: 'tests', label: 'الفحوصات' },
    { key: 'lab', label: 'بيانات المختبر' },
    ...(canManageUsers ? [{ key: 'staff', label: 'المستخدمون والصلاحيات' }] : []),
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
      {tab === 'tests' && <TestsTab catalog={catalog} inventory={inventory} orders={orders} actions={actions} askConfirm={askConfirm} isManager={isManager} can={can} />}
      {tab === 'lab' && <LabInfoTab labSettings={labSettings} actions={actions} isManager={isManager} can={can} />}
      {tab === 'staff' && canManageUsers && <UsersPermissionsTab staff={staff} permissions={permissions} actions={actions} myId={myId} askConfirm={askConfirm} />}
    </div>
  );
}
