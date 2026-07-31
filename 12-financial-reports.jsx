// التقارير المالية: التقرير العام، عمولات الأطباء، ولوحة التقارير، وكشف حساب العملاء

// التقارير المالية: التقرير العام، عمولات الأطباء، كشوف الحسابات، دفتر الأستاذ، الميزانية، شجرة الحسابات

// ---------------------------------------------------------------------------
// Financial reports
// ---------------------------------------------------------------------------
function toDateInputValue(d) { return d.toISOString().slice(0, 10); }

function GeneralReportTab({ accounts, transactions, invoices, purchases }) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [fromDate, setFromDate] = useState(toDateInputValue(firstOfMonth));
  const [toDate, setToDate] = useState(toDateInputValue(today));
  const [accountId, setAccountId] = useState('all');

  const inRange = transactions.filter((t) => {
    const d = new Date(t.created_at);
    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');
    const accountMatch = accountId === 'all' || t.account_id === accountId;
    return d >= from && d <= to && accountMatch;
  });

  const totalIn = inRange.filter((t) => t.direction === 'in').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = inRange.filter((t) => t.direction === 'out').reduce((s, t) => s + Number(t.amount), 0);
  const net = totalIn - totalOut;

  const byCategory = {};
  inRange.forEach((t) => {
    const key = `${t.direction}|${t.category}`;
    byCategory[key] = (byCategory[key] || 0) + Number(t.amount);
  });
  const incomeCats = Object.entries(byCategory).filter(([k]) => k.startsWith('in|')).map(([k, v]) => ({ category: k.slice(3), total: v })).sort((a, b) => b.total - a.total);
  const expenseCats = Object.entries(byCategory).filter(([k]) => k.startsWith('out|')).map(([k, v]) => ({ category: k.slice(4), total: v })).sort((a, b) => b.total - a.total);

  const sortedTx = inRange.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const receivable = invoices.filter((i) => !i.voided).reduce((s, i) => s + Math.max(0, Number(i.amount) - invoicePaid(i)), 0);
  const payable = purchases.reduce((s, p) => s + Math.max(0, Number(p.total_amount) - purchasePaid(p)), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end no-print">
        <button onClick={() => window.print()} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>طباعة التقرير</button>
      </div>

      <div className="no-print grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="من تاريخ"><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={{ ...inputStyle, background: C.surface }} /></Field>
        <Field label="إلى تاريخ"><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={{ ...inputStyle, background: C.surface }} /></Field>
        <Field label="الحساب">
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm" style={{ ...inputStyle, background: C.surface }}>
            <option value="all">كل الحسابات</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      </div>

      <div id="report-area" className="space-y-5">
        <div className="hidden print:block mb-4">
          <div className="text-xl font-bold" style={{ color: C.ink }}>مختبر الشموخ — تقرير مالي</div>
          <div className="text-sm" style={{ color: C.inkMuted }}>من {fmtDate(fromDate)} إلى {fmtDate(toDate)}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="إجمالي الإيرادات" value={SAR(totalIn)} />
          <StatCard label="إجمالي المصروفات" value={SAR(totalOut)} tone={totalOut ? 'warning' : undefined} />
          <StatCard label="صافي الفترة" value={SAR(net)} tone={net < 0 ? 'critical' : undefined} />
        </div>

        <div>
          <div className="text-xs font-bold mb-2" style={{ color: C.inkMuted }}>لقطة مالية حالية (بغض النظر عن الفترة أعلاه)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard label="مستحق من المرضى (فواتير غير مسدّدة)" value={SAR(receivable)} tone={receivable ? 'warning' : undefined} />
            <StatCard label="مستحق للموردين (مشتريات غير مسدّدة)" value={SAR(payable)} tone={payable ? 'critical' : undefined} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <div className="font-bold mb-3" style={{ color: C.ink }}>الإيرادات حسب التصنيف</div>
            {incomeCats.length === 0 ? <EmptyState text="لا توجد إيرادات في هذه الفترة" /> : (
              <div className="space-y-2">
                {incomeCats.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div style={{ color: C.ink }}>{c.category}</div>
                    <div className="font-mono font-bold" style={{ color: C.normal }}>{SAR(c.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <div className="font-bold mb-3" style={{ color: C.ink }}>المصروفات حسب التصنيف</div>
            {expenseCats.length === 0 ? <EmptyState text="لا توجد مصروفات في هذه الفترة" /> : (
              <div className="space-y-2">
                {expenseCats.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div style={{ color: C.ink }}>{c.category}</div>
                    <div className="font-mono font-bold" style={{ color: C.critical }}>{SAR(c.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
              <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>التاريخ</th>
              <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الحساب</th>
              <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>التصنيف</th>
              <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الوصف</th>
              <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المبلغ</th>
            </tr></thead>
            <tbody>
              {sortedTx.map((t) => {
                const acc = accounts.find((a) => a.id === t.account_id);
                return (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.inkMuted }}>{fmtDate(t.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: C.ink }}>{acc?.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: C.inkMuted }}>{t.category}</td>
                    <td className="px-4 py-3" style={{ color: C.inkMuted }}>{t.description}</td>
                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap" style={{ color: t.direction === 'in' ? C.normal : C.critical }}>{t.direction === 'in' ? '+' : '-'}{SAR(t.amount)}</td>
                  </tr>
                );
              })}
              {sortedTx.length === 0 && <tr><td colSpan={5}><EmptyState text="لا توجد حركات مالية في هذه الفترة" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Referring-doctor commissions
// ---------------------------------------------------------------------------
function DoctorsCommissionTab({ orders, invoices, referringDoctors, commissionPayments, accounts, actions }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', commissionType: 'percentage', commissionValue: '' });
  const [payingName, setPayingName] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', accountId: '', notes: '' });
  const [error, setError] = useState('');

  const byDoctor = {};
  orders.filter((o) => o.status === 'completed' && o.referring_doctor).forEach((o) => {
    const inv = invoices.find((i) => i.order_id === o.id);
    const amount = inv && !inv.voided ? Number(inv.amount) : 0;
    const key = o.referring_doctor;
    if (!byDoctor[key]) byDoctor[key] = { name: key, orderCount: 0, totalBilling: 0 };
    byDoctor[key].orderCount += 1;
    byDoctor[key].totalBilling += amount;
  });
  referringDoctors.forEach((d) => { if (!byDoctor[d.name]) byDoctor[d.name] = { name: d.name, orderCount: 0, totalBilling: 0 }; });

  const rows = Object.values(byDoctor).map((row) => {
    const reg = referringDoctors.find((d) => d.name === row.name);
    const owed = reg ? (reg.commission_type === 'percentage' ? row.totalBilling * Number(reg.commission_value) / 100 : row.orderCount * Number(reg.commission_value)) : 0;
    const paid = commissionPayments.filter((c) => c.doctor_name === row.name).reduce((s, c) => s + Number(c.amount), 0);
    return { ...row, registered: Boolean(reg), rate: reg, owed, paid, balance: owed - paid };
  }).sort((a, b) => b.balance - a.balance);

  const resetForm = () => { setForm({ name: '', phone: '', commissionType: 'percentage', commissionValue: '' }); setEditingId(null); setShowForm(false); setError(''); };
  const startEdit = (d) => { setEditingId(d.id); setForm({ name: d.name, phone: d.phone || '', commissionType: d.commission_type, commissionValue: String(d.commission_value) }); setShowForm(true); setError(''); };
  const startRegister = (name) => { setForm({ name, phone: '', commissionType: 'percentage', commissionValue: '' }); setEditingId(null); setShowForm(true); setError(''); };

  const submit = async () => {
    if (!form.name.trim()) { setError('اسم الطبيب مطلوب'); return; }
    const value = Number(form.commissionValue);
    if (isNaN(value) || value < 0) { setError('نسبة/قيمة العمولة يجب أن تكون رقماً موجباً'); return; }
    const payload = { name: form.name.trim(), phone: form.phone.trim() || null, commission_type: form.commissionType, commission_value: value };
    if (editingId) await actions.updateReferringDoctor(editingId, payload); else await actions.addReferringDoctor(payload);
    resetForm();
  };

  const openPay = (row) => { setPayingName(row.name); setPayForm({ amount: row.balance > 0 ? String(row.balance) : '', accountId: accounts[0]?.id || '', notes: '' }); setError(''); };
  const submitPay = async () => {
    const amount = Number(payForm.amount);
    if (isNaN(amount) || amount <= 0) { setError('أدخل مبلغاً صحيحاً'); return; }
    if (!payForm.accountId) { setError('اختر الحساب الذي سيُصرف منه'); return; }
    await actions.payDoctorCommission(payingName, amount, payForm.accountId, payForm.notes.trim());
    setPayingName(null); setError('');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="text-xs" style={{ color: C.inkMuted }}>تُحسب العمولة على الطلبات المكتملة المرتبطة باسم الطبيب المُدخل عند إنشاء الطلب.</div>
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-3.5 py-2 rounded-lg text-sm font-bold whitespace-nowrap" style={{ background: C.accent, color: '#fff' }}>+ طبيب محوّل</button>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {showForm && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="اسم الطبيب"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
            <Field label="الهاتف (اختياري)"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="نوع العمولة">
              <select value={form.commissionType} onChange={(e) => setForm({ ...form, commissionType: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                <option value="percentage">نسبة % من قيمة الفاتورة</option>
                <option value="fixed">مبلغ ثابت لكل طلب</option>
              </select>
            </Field>
            <Field label={form.commissionType === 'percentage' ? 'النسبة %' : 'المبلغ لكل طلب'}><input type="number" min="0" value={form.commissionValue} onChange={(e) => setForm({ ...form, commissionValue: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>{editingId ? 'حفظ التعديلات' : 'حفظ'}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
          </div>
        </div>
      )}
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الطبيب</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>عدد الطلبات</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>العمولة</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المستحق</th>
            <th></th>
          </tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: C.ink }}>د. {row.name}</td>
                <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: C.inkMuted }}>{row.orderCount}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {row.registered ? <span className="text-xs" style={{ color: C.inkMuted }}>{row.rate.commission_type === 'percentage' ? `${row.rate.commission_value}%` : SAR(row.rate.commission_value) + ' / طلب'}</span> : <Badge tone="warning">غير مسجّل</Badge>}
                </td>
                <td className="px-4 py-3 font-mono font-bold whitespace-nowrap" style={{ color: row.balance > 0 ? C.critical : C.inkMuted }}>{SAR(row.balance)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {row.registered ? <button onClick={() => startEdit(row.rate)} className="text-xs font-bold" style={{ color: C.accent }}>تعديل</button> : <button onClick={() => startRegister(row.name)} className="text-xs font-bold" style={{ color: C.accent }}>تسجيل العمولة</button>}
                    {row.registered && row.orderCount === 0 && <button onClick={() => actions.deleteReferringDoctor(row.rate.id, row.name)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button>}
                    {row.balance > 0 && <button onClick={() => openPay(row)} className="text-xs font-bold" style={{ color: C.normal }}>صرف</button>}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5}><EmptyState text="لا يوجد أطباء محوّلون بعد" /></td></tr>}
          </tbody>
        </table>
      </div>

      {payingName && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="font-bold text-sm" style={{ color: C.ink }}>صرف عمولة — د. {payingName}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="المبلغ"><input type="number" min="0" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="يُصرف من">
              <select value={payForm.accountId} onChange={(e) => setPayForm({ ...payForm, accountId: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                <option value="">اختر...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="ملاحظات (اختياري)"><input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
          </div>
          <div className="flex gap-2">
            <button onClick={submitPay} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>تأكيد الصرف</button>
            <button onClick={() => setPayingName(null)} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FinancialReportsView({ accounts, transactions, invoices, purchases, orders, referringDoctors, commissionPayments, patients, suppliers, chartOfAccounts, journalLines, actions }) {
  const [tab, setTab] = useState('general');
  const TABS = [
    ['general', 'التقرير العام'],
    ['doctors', 'عمولات الأطباء'],
    ['customers', 'كشوفات حساب العملاء'],
    ['suppliers-stmt', 'كشوفات حساب الموردين'],
    ['purchases-report', 'تقرير المشتريات'],
    ['ledger', 'ميزان المراجعة / بيان الدخل'],
    ['balance-sheet', 'قائمة المركز المالي'],
    ['coa', 'الشجرة المحاسبية'],
  ];
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-2xl font-bold" style={{ color: C.ink }}>التقارير المالية</div>
        <div className="flex flex-wrap rounded-lg overflow-hidden no-print" style={{ border: `1px solid ${C.line}` }}>
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className="px-4 py-2 text-sm font-bold" style={{ background: tab === key ? C.accent : C.surface, color: tab === key ? '#fff' : C.inkMuted }}>{label}</button>
          ))}
        </div>
      </div>
      {tab === 'general' && <GeneralReportTab accounts={accounts} transactions={transactions} invoices={invoices} purchases={purchases} />}
      {tab === 'doctors' && <DoctorsCommissionTab orders={orders} invoices={invoices} referringDoctors={referringDoctors} commissionPayments={commissionPayments} accounts={accounts} actions={actions} />}
      {tab === 'customers' && <CustomerStatementsTab patients={patients} orders={orders} invoices={invoices} />}
      {tab === 'suppliers-stmt' && <SupplierStatementsTab suppliers={suppliers} purchases={purchases} />}
      {tab === 'purchases-report' && <PurchasesReportTab purchases={purchases} suppliers={suppliers} />}
      {tab === 'ledger' && <GeneralLedgerTab journalLines={journalLines} chartOfAccounts={chartOfAccounts} />}
      {tab === 'balance-sheet' && <BalanceSheetTab journalLines={journalLines} chartOfAccounts={chartOfAccounts} accounts={accounts} />}
      {tab === 'coa' && <ChartOfAccountsTab chartOfAccounts={chartOfAccounts} actions={actions} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// كشف حساب عميل (مريض)
// ---------------------------------------------------------------------------
function CustomerStatementsTab({ patients, orders, invoices }) {
  const [patientId, setPatientId] = useState('');
  const patient = patients.find((p) => p.id === patientId);

  const patientOrderIds = new Set(orders.filter((o) => o.patient_id === patientId).map((o) => o.id));
  const patientInvoices = invoices.filter((inv) => patientOrderIds.has(inv.order_id) && !inv.voided);

  const rows = [];
  patientInvoices.forEach((inv) => {
    const order = orders.find((o) => o.id === inv.order_id);
    rows.push({ date: inv.created_at, type: 'فاتورة', label: `فاتورة فحوصات — ${order?.sample_id || ''}`, debit: Number(inv.amount), credit: 0 });
    (inv.payments || []).forEach((p) => {
      rows.push({ date: p.created_at, type: 'دفعة', label: `دفعة (${p.method})`, debit: 0, credit: Number(p.amount) });
    });
  });
  rows.sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const rowsWithBalance = rows.map((r) => { running += r.debit - r.credit; return { ...r, balance: running }; });
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 no-print">
        <Field label="اختر العميل (المريض)">
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-64 px-3 py-2 rounded-md text-sm" style={inputStyle}>
            <option value="">اختر مريضاً...</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        {patientId && <button onClick={() => window.print()} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>طباعة</button>}
      </div>

      {!patientId ? <EmptyState text="اختر عميلاً لعرض كشف حسابه" /> : (
        <div id="report-area" className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
            <div className="text-lg font-bold" style={{ color: C.ink }}>كشف حساب: {patient?.name}</div>
            <div className="text-xs font-mono" style={{ color: C.inkMuted }}>{patient?.phone || ''}</div>
          </div>
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>التاريخ</th>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>البيان</th>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>مدين (عليه)</th>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>دائن (له)</th>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>الرصيد</th>
            </tr></thead>
            <tbody>
              {rowsWithBalance.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap" style={{ color: C.inkMuted }}>{fmtDate(r.date)}</td>
                  <td className="px-4 py-2.5" style={{ color: C.ink }}>{r.label}</td>
                  <td className="px-4 py-2.5 font-mono" style={{ color: C.critical }}>{r.debit ? SAR(r.debit) : '—'}</td>
                  <td className="px-4 py-2.5 font-mono" style={{ color: C.normal }}>{r.credit ? SAR(r.credit) : '—'}</td>
                  <td className="px-4 py-2.5 font-mono font-bold" style={{ color: C.ink }}>{SAR(r.balance)}</td>
                </tr>
              ))}
              {rowsWithBalance.length === 0 && <tr><td colSpan={5}><EmptyState text="لا توجد حركات على هذا العميل" /></td></tr>}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${C.line}`, background: C.bg }}>
                <td colSpan={2} className="px-4 py-3 font-bold" style={{ color: C.ink }}>الإجمالي</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: C.critical }}>{SAR(totalDebit)}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: C.normal }}>{SAR(totalCredit)}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: C.ink }}>{SAR(totalDebit - totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// كشف حساب مورد
// ---------------------------------------------------------------------------
