// الموردين والمشتريات

// ---------------------------------------------------------------------------
// Suppliers & Purchases
// ---------------------------------------------------------------------------
function purchasePaid(p) { return (p.purchase_payments || []).reduce((s, x) => s + Number(x.amount), 0); }

function SuppliersView({ suppliers, purchases, inventory, accounts, actions, askConfirm, isManager, can }) {
  const [tab, setTab] = useState('suppliers');

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-2xl font-bold" style={{ color: C.ink }}>الموردين والمشتريات</div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          <button onClick={() => setTab('suppliers')} className="px-4 py-2 text-sm font-bold" style={{ background: tab === 'suppliers' ? C.accent : C.surface, color: tab === 'suppliers' ? '#fff' : C.inkMuted }}>الموردين</button>
          <button onClick={() => setTab('purchases')} className="px-4 py-2 text-sm font-bold" style={{ background: tab === 'purchases' ? C.accent : C.surface, color: tab === 'purchases' ? '#fff' : C.inkMuted }}>المشتريات</button>
        </div>
      </div>
      {tab === 'suppliers'
        ? <SuppliersTab suppliers={suppliers} purchases={purchases} actions={actions} askConfirm={askConfirm} isManager={isManager} can={can} />
        : <PurchasesTab suppliers={suppliers} purchases={purchases} inventory={inventory} accounts={accounts} actions={actions} />}
    </div>
  );
}

function SuppliersTab({ suppliers, purchases, actions, askConfirm, isManager, can }) {
  const canManage = isManager || (can && can('manage_suppliers'));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [error, setError] = useState('');
  const { page, setPage, totalPages, pageItems } = usePagination(suppliers, 6);

  const resetForm = () => { setForm({ name: '', phone: '', notes: '' }); setEditingId(null); setShowForm(false); setError(''); };
  const startEdit = (s) => { setEditingId(s.id); setForm({ name: s.name, phone: s.phone || '', notes: s.notes || '' }); setShowForm(true); setError(''); };

  const submit = async () => {
    if (!form.name.trim()) { setError('اسم المورد مطلوب'); return; }
    const payload = { name: form.name.trim(), phone: form.phone.trim(), notes: form.notes.trim() };
    if (editingId) await actions.updateSupplier(editingId, payload); else await actions.addSupplier(payload);
    resetForm();
  };

  const balanceFor = (supplierId) => purchases
    .filter((p) => p.supplier_id === supplierId)
    .reduce((s, p) => s + Math.max(0, p.total_amount - purchasePaid(p)), 0);

  const onDelete = (s) => {
    const used = purchases.some((p) => p.supplier_id === s.id);
    if (used) { setError(`لا يمكن حذف "${s.name}" — لديه فواتير شراء مسجلة`); return; }
    askConfirm({ title: 'حذف مورد', message: `هل تريد حذف "${s.name}"؟`, danger: true, onConfirm: () => actions.deleteSupplier(s.id, s.name) });
  };

  return (
    <div className="space-y-4">
      {canManage && <div className="flex justify-end">
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>+ مورد جديد</button>
      </div>}
      {showForm && canManage && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="اسم المورد"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
            <Field label="رقم الهاتف"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="ملاحظات"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex gap-2">
            <button onClick={submit} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>{editingId ? 'حفظ التعديلات' : 'حفظ المورد'}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
          </div>
        </div>
      )}
      {!showForm && <ErrorNote>{error}</ErrorNote>}
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المورد</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الهاتف</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>رصيد مستحق</th>
            <th></th>
          </tr></thead>
          <tbody>
            {pageItems.map((s) => {
              const bal = balanceFor(s.id);
              return (
                <tr key={s.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: C.ink }}>{s.name}</td>
                  <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: C.inkMuted }}>{s.phone}</td>
                  <td className="px-4 py-3 font-mono font-bold whitespace-nowrap" style={{ color: bal ? C.critical : C.inkMuted }}>{SAR(bal)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canManage && <div className="flex items-center gap-3">
                      <button onClick={() => startEdit(s)} className="text-xs font-bold" style={{ color: C.accent }}>تعديل</button>
                      <button onClick={() => onDelete(s)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button>
                    </div>}
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && <tr><td colSpan={4}><EmptyState text="لا يوجد موردون مسجلون" /></td></tr>}
          </tbody>
        </table>
        <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
}

function PurchasesTab({ suppliers, purchases, inventory, accounts, actions }) {
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [paymentType, setPaymentType] = useState('نقدي');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [lines, setLines] = useState({}); // itemId -> { checked, qty, cost }
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'نقدي', accountId: accounts[0]?.id || '' });
  const { page, setPage, totalPages, pageItems } = usePagination(purchases, 6);

  const toggleLine = (id) => setLines((l) => ({ ...l, [id]: { ...(l[id] || { qty: '1', cost: '' }), checked: !l[id]?.checked } }));
  const updateLine = (id, field, value) => setLines((l) => ({ ...l, [id]: { ...(l[id] || {}), [field]: value } }));

  const selectedLines = Object.entries(lines).filter(([, v]) => v.checked);
  const total = selectedLines.reduce((s, [, v]) => s + (Number(v.qty) || 0) * (Number(v.cost) || 0), 0);

  const resetForm = () => { setSupplierId(''); setPaymentType('نقدي'); setInvoiceNo(''); setAccountId(accounts[0]?.id || ''); setLines({}); setShowForm(false); setError(''); };

  const submit = async () => {
    if (!supplierId) { setError('اختر مورداً'); return; }
    if (selectedLines.length === 0) { setError('اختر صنفاً واحداً على الأقل'); return; }
    for (const [, v] of selectedLines) {
      if (!v.qty || Number(v.qty) <= 0 || !v.cost || Number(v.cost) < 0) { setError('تأكد من إدخال كمية وسعر صحيحين لكل صنف محدد'); return; }
    }
    if (paymentType === 'نقدي' && !accountId) { setError('اختر الصندوق أو الحساب الذي سيُدفع منه'); return; }
    const items = selectedLines.map(([id, v]) => {
      const item = inventory.find((i) => i.id === id);
      return { item_id: id, item_name: item?.name || '', quantity: Number(v.qty), unit_cost: Number(v.cost) };
    });
    await actions.addPurchase(supplierId, items, paymentType, invoiceNo.trim(), paymentType === 'نقدي' ? accountId : null);
    resetForm();
  };

  const openPay = (p) => { setExpandedId(p.id === expandedId ? null : p.id); setPayForm({ amount: '', method: 'نقدي', accountId: accounts[0]?.id || '' }); setError(''); };
  const submitPayment = async (p) => {
    const amount = Number(payForm.amount);
    const remaining = p.total_amount - purchasePaid(p);
    if (isNaN(amount) || amount <= 0) { setError('أدخل مبلغاً صحيحاً أكبر من صفر'); return; }
    if (amount > remaining) { setError(`المبلغ أكبر من المتبقي (${SAR(remaining)})`); return; }
    if (!payForm.accountId) { setError('اختر الصندوق أو الحساب الذي سيُدفع منه'); return; }
    await actions.addPurchasePayment(p.id, amount, payForm.method, payForm.accountId);
    setExpandedId(null); setError('');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>+ فاتورة شراء جديدة</button>
      </div>

      {showForm && (
        <div className="rounded-lg p-4 space-y-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="المورد">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                <option value="">اختر مورداً...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="نوع الدفع">
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                <option value="نقدي">نقدي</option>
                <option value="آجل">آجل</option>
              </select>
            </Field>
            <Field label="رقم فاتورة المورد (اختياري)"><input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            {paymentType === 'نقدي' && (
              <Field label="الصندوق/الحساب الدافع">
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
            )}
          </div>

          <div>
            <div className="text-xs font-bold mb-2" style={{ color: C.inkMuted }}>الأصناف المشتراة</div>
            <div className="space-y-2">
              {inventory.map((item) => {
                const line = lines[item.id] || {};
                return (
                  <div key={item.id} className="rounded-md p-3" style={{ background: line.checked ? C.accentSoft : C.bg, border: `1px solid ${line.checked ? C.accent : C.line}` }}>
                    <label className="flex items-center gap-2 text-sm mb-2">
                      <input type="checkbox" checked={Boolean(line.checked)} onChange={() => toggleLine(item.id)} />
                      <span style={{ color: C.ink }}>{item.name}</span>
                      <span className="text-xs" style={{ color: C.inkMuted }}>({item.unit})</span>
                    </label>
                    {line.checked && (
                      <div className="grid grid-cols-2 gap-2 pr-6">
                        <input type="number" min="0" placeholder="الكمية" value={line.qty || ''} onChange={(e) => updateLine(item.id, 'qty', e.target.value)} className="px-3 py-1.5 rounded-md text-sm font-mono" style={{ ...inputStyle, background: C.surface }} />
                        <input type="number" min="0" placeholder="سعر الوحدة" value={line.cost || ''} onChange={(e) => updateLine(item.id, 'cost', e.target.value)} className="px-3 py-1.5 rounded-md text-sm font-mono" style={{ ...inputStyle, background: C.surface }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <ErrorNote>{error}</ErrorNote>
          <div className="flex items-center justify-between flex-wrap gap-3 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="text-sm" style={{ color: C.inkMuted }}>الإجمالي: <span className="font-mono font-bold text-base" style={{ color: C.ink }}>{SAR(total)}</span></div>
            <button onClick={submit} className="px-4 py-2.5 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>حفظ فاتورة الشراء</button>
          </div>
        </div>
      )}

      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المورد</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>التاريخ</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الإجمالي</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المتبقي</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>النوع</th>
            <th></th>
          </tr></thead>
          <tbody>
            {pageItems.slice().reverse().map((p) => {
              const supplier = suppliers.find((s) => s.id === p.supplier_id);
              const remaining = Math.max(0, p.total_amount - purchasePaid(p));
              return (
                <React.Fragment key={p.id}>
                  <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: C.ink }}>{supplier?.name}</td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.inkMuted }}>{fmtDate(p.created_at)}</td>
                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap" style={{ color: C.ink }}>{SAR(p.total_amount)}</td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: remaining ? C.critical : C.inkMuted }}>{SAR(remaining)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={p.payment_type === 'نقدي' ? 'normal' : remaining ? 'warning' : 'normal'}>{p.payment_type}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap">{remaining > 0 && <button onClick={() => openPay(p)} className="text-xs font-bold" style={{ color: C.accent }}>تسجيل دفعة</button>}</td>
                  </tr>
                  {expandedId === p.id && (
                    <tr style={{ background: C.bg }}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex flex-wrap items-end gap-3">
                          <Field label="المبلغ"><input type="number" min="0" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-32 px-3 py-2 rounded-md text-sm font-mono" style={{ ...inputStyle, background: C.surface }} /></Field>
                          <Field label="طريقة الدفع"><select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="px-3 py-2 rounded-md text-sm" style={{ ...inputStyle, background: C.surface }}><option>نقدي</option><option>بطاقة</option><option>تحويل بنكي</option></select></Field>
                          <Field label="الصندوق/الحساب الدافع"><select value={payForm.accountId} onChange={(e) => setPayForm({ ...payForm, accountId: e.target.value })} className="px-3 py-2 rounded-md text-sm" style={{ ...inputStyle, background: C.surface }}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
                          <button onClick={() => submitPayment(p)} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>تأكيد</button>
                          <button onClick={() => setExpandedId(null)} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
                        </div>
                        <ErrorNote>{error}</ErrorNote>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {pageItems.length === 0 && <tr><td colSpan={6}><EmptyState text="لا توجد فواتير شراء" /></td></tr>}
          </tbody>
        </table>
        <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
}
