// الخزينة: الصناديق والحسابات البنكية، المعاملات اليدوية، الرواتب

const COMMON_TX_CATEGORIES = ['رواتب', 'إيجار', 'كهرباء وماء', 'صيانة', 'مصاريف إدارية', 'إيرادات أخرى', 'أخرى'];

// ---------------------------------------------------------------------------
// Treasury: cash boxes, bank accounts, and financial overview
// ---------------------------------------------------------------------------
function accountBalance(account, transactions) {
  const txs = transactions.filter((t) => t.account_id === account.id);
  const inSum = txs.filter((t) => t.direction === 'in').reduce((s, t) => s + Number(t.amount), 0);
  const outSum = txs.filter((t) => t.direction === 'out').reduce((s, t) => s + Number(t.amount), 0);
  return Number(account.opening_balance) + inSum - outSum;
}

function AccountsTab({ accounts, transactions, chartOfAccounts, actions, askConfirm, isManager }) {
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [accForm, setAccForm] = useState({ name: '', type: 'نقدي', bankName: '', accountNumber: '', openingBalance: '' });
  const [error, setError] = useState('');
  const [expandedAccountId, setExpandedAccountId] = useState(null);
  const [txForm, setTxForm] = useState({ direction: 'in', amount: '', category: '', description: '', coaId: '' });
  const postableCoa = chartOfAccounts.filter((a) => a.type === 'revenue' || a.type === 'expense');

  const cashTotal = accounts.filter((a) => a.type === 'نقدي').reduce((s, a) => s + accountBalance(a, transactions), 0);
  const bankTotal = accounts.filter((a) => a.type === 'بنكي').reduce((s, a) => s + accountBalance(a, transactions), 0);

  const now = new Date();
  const monthTx = transactions.filter((t) => { const d = new Date(t.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const monthIn = monthTx.filter((t) => t.direction === 'in').reduce((s, t) => s + Number(t.amount), 0);
  const monthOut = monthTx.filter((t) => t.direction === 'out').reduce((s, t) => s + Number(t.amount), 0);

  const resetAccForm = () => { setAccForm({ name: '', type: 'نقدي', bankName: '', accountNumber: '', openingBalance: '' }); setEditingId(null); setShowAccountForm(false); setError(''); };
  const startEdit = (a) => { setEditingId(a.id); setAccForm({ name: a.name, type: a.type, bankName: a.bank_name || '', accountNumber: a.account_number || '', openingBalance: String(a.opening_balance) }); setShowAccountForm(true); setError(''); };

  const submitAccount = async () => {
    if (!accForm.name.trim()) { setError('اسم الحساب مطلوب'); return; }
    const opening = Number(accForm.openingBalance) || 0;
    const payload = { name: accForm.name.trim(), type: accForm.type, bank_name: accForm.bankName.trim() || null, account_number: accForm.accountNumber.trim() || null, opening_balance: opening };
    if (editingId) await actions.updateAccount(editingId, payload); else await actions.addAccount(payload);
    resetAccForm();
  };

  const onDeleteAccount = (a) => {
    const used = transactions.some((t) => t.account_id === a.id);
    if (used) { setError(`لا يمكن حذف "${a.name}" — له حركات مالية مسجلة`); return; }
    askConfirm({ title: 'حذف حساب', message: `هل تريد حذف "${a.name}"؟`, danger: true, onConfirm: () => actions.deleteAccount(a.id, a.name) });
  };

  const openTx = (a) => { setExpandedAccountId(a.id === expandedAccountId ? null : a.id); setTxForm({ direction: 'in', amount: '', category: '', description: '', coaId: '' }); setError(''); };
  const submitTx = async (a) => {
    const amount = Number(txForm.amount);
    if (isNaN(amount) || amount <= 0) { setError('أدخل مبلغاً صحيحاً أكبر من صفر'); return; }
    if (!txForm.category.trim()) { setError('أدخل تصنيف الحركة (مثلاً: إيجار، رواتب، إيداع رأس مال)'); return; }
    if (!txForm.coaId) { setError('اختر الحساب من الشجرة المحاسبية (إيرادات أو مصروفات)'); return; }
    await actions.addManualTransaction(a.id, txForm.direction, amount, txForm.category.trim(), txForm.description.trim(), txForm.coaId);
    setExpandedAccountId(null); setError('');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="إجمالي الصناديق النقدية" value={SAR(cashTotal)} />
        <StatCard label="إجمالي الحسابات البنكية" value={SAR(bankTotal)} />
        <StatCard label="إيرادات هذا الشهر" value={SAR(monthIn)} />
        <StatCard label="مصروفات هذا الشهر" value={SAR(monthOut)} tone={monthOut ? 'warning' : undefined} />
      </div>

      {isManager && <div className="flex justify-end">
        <button onClick={() => (showAccountForm ? resetAccForm() : setShowAccountForm(true))} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>+ حساب جديد</button>
      </div>}

      {showAccountForm && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="اسم الحساب"><input value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
            <Field label="النوع">
              <select value={accForm.type} onChange={(e) => setAccForm({ ...accForm, type: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                <option value="نقدي">صندوق نقدي</option>
                <option value="بنكي">حساب بنكي</option>
              </select>
            </Field>
            {accForm.type === 'بنكي' && <Field label="اسم البنك"><input value={accForm.bankName} onChange={(e) => setAccForm({ ...accForm, bankName: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>}
            {accForm.type === 'بنكي' && <Field label="رقم الحساب"><input value={accForm.accountNumber} onChange={(e) => setAccForm({ ...accForm, accountNumber: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>}
            <Field label="الرصيد الافتتاحي"><input type="number" value={accForm.openingBalance} onChange={(e) => setAccForm({ ...accForm, openingBalance: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex gap-2">
            <button onClick={submitAccount} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>{editingId ? 'حفظ التعديلات' : 'حفظ الحساب'}</button>
            <button onClick={resetAccForm} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
          </div>
        </div>
      )}
      {!showAccountForm && <ErrorNote>{error}</ErrorNote>}

      <div className="space-y-3">
        {accounts.map((a) => {
          const bal = accountBalance(a, transactions);
          const accTx = transactions.filter((t) => t.account_id === a.id).slice().reverse().slice(0, 5);
          return (
            <div key={a.id} className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-bold text-sm flex items-center gap-2" style={{ color: C.ink }}>
                    {a.name} <Badge tone="accent">{a.type}</Badge>
                  </div>
                  {a.type === 'بنكي' && <div className="text-xs font-mono" style={{ color: C.inkMuted }}>{a.bank_name} · {a.account_number}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-mono font-bold text-base" style={{ color: C.ink }}>{SAR(bal)}</div>
                  <button onClick={() => openTx(a)} className="text-xs font-bold" style={{ color: C.accent }}>قيد يدوي</button>
                  {isManager && <button onClick={() => startEdit(a)} className="text-xs font-bold" style={{ color: C.accent }}>تعديل</button>}
                  {isManager && <button onClick={() => onDeleteAccount(a)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button>}
                </div>
              </div>

              {expandedAccountId === a.id && (
                <div className="mt-3 pt-3 space-y-3" style={{ borderTop: `1px solid ${C.line}` }}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                    <Field label="النوع">
                      <select value={txForm.direction} onChange={(e) => setTxForm({ ...txForm, direction: e.target.value, coaId: '' })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                        <option value="in">إيداع (دخل)</option>
                        <option value="out">مصروف (خرج)</option>
                      </select>
                    </Field>
                    <Field label="المبلغ"><input type="number" min="0" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
                    <Field label="التصنيف">
                      <input list="tx-categories-list" value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })} placeholder="إيجار، رواتب..." className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} />
                      <datalist id="tx-categories-list">{COMMON_TX_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
                    </Field>
                    <Field label="حساب الشجرة المحاسبية">
                      <select value={txForm.coaId} onChange={(e) => setTxForm({ ...txForm, coaId: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                        <option value="">اختر...</option>
                        {postableCoa.filter((c) => c.type === (txForm.direction === 'in' ? 'revenue' : 'expense')).map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name_ar}</option>)}
                      </select>
                    </Field>
                    <Field label="ملاحظات (اختياري)"><input value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => submitTx(a)} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>حفظ القيد</button>
                    <button onClick={() => setExpandedAccountId(null)} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
                  </div>
                  {accTx.length > 0 && (
                    <div className="text-xs space-y-1 pt-2" style={{ color: C.inkMuted, borderTop: `1px solid ${C.line}` }}>
                      <div className="font-bold" style={{ color: C.ink }}>آخر الحركات</div>
                      {accTx.map((t) => (
                        <div key={t.id} className="flex items-center justify-between">
                          <span>{fmtDate(t.created_at)} · {t.category}{t.description ? ' — ' + t.description : ''}</span>
                          <span className="font-mono font-bold" style={{ color: t.direction === 'in' ? C.normal : C.critical }}>{t.direction === 'in' ? '+' : '-'}{SAR(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {accounts.length === 0 && <EmptyState text="لا توجد صناديق أو حسابات مسجلة بعد" />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------
function PayrollTab({ staff, accounts, salaryPayments, actions }) {
  const [editingSalaryId, setEditingSalaryId] = useState(null);
  const [salaryDraft, setSalaryDraft] = useState('');
  const [payingId, setPayingId] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', accountId: '', period: '' });
  const [error, setError] = useState('');

  const startEditSalary = (p) => { setEditingSalaryId(p.id); setSalaryDraft(p.base_salary != null ? String(p.base_salary) : ''); };
  const saveSalary = (p) => {
    const val = salaryDraft === '' ? null : Number(salaryDraft);
    if (val !== null && (isNaN(val) || val < 0)) { setError('الراتب يجب أن يكون رقماً موجباً'); return; }
    actions.updateStaffSalary(p.id, p.display_name, val);
    setEditingSalaryId(null); setError('');
  };

  const openPay = (p) => { setPayingId(p.id); setPayForm({ amount: p.base_salary != null ? String(p.base_salary) : '', accountId: accounts[0]?.id || '', period: '' }); setError(''); };
  const submitPay = (p) => {
    const amount = Number(payForm.amount);
    if (isNaN(amount) || amount <= 0) { setError('أدخل مبلغاً صحيحاً'); return; }
    if (!payForm.accountId) { setError('اختر الصندوق أو الحساب الذي سيُصرف منه'); return; }
    actions.paySalary(p.id, p.display_name, amount, payForm.accountId, payForm.period.trim());
    setPayingId(null); setError('');
  };

  const paidFor = (profileId) => salaryPayments.filter((s) => s.profile_id === profileId).reduce((s, x) => s + Number(x.amount), 0);
  const recent = salaryPayments.slice(0, 8);

  return (
    <div className="space-y-4">
      <ErrorNote>{error}</ErrorNote>
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الموظف</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الراتب الأساسي</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>إجمالي المصروف</th>
            <th></th>
          </tr></thead>
          <tbody>
            {staff.map((p) => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: C.ink }}>{p.display_name}<div className="text-xs font-normal" style={{ color: C.inkMuted }}>{p.role}</div></td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {editingSalaryId === p.id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" value={salaryDraft} onChange={(e) => setSalaryDraft(e.target.value)} className="w-28 px-2 py-1 rounded-md text-sm font-mono" style={inputStyle} autoFocus />
                      <button onClick={() => saveSalary(p)} className="text-xs font-bold" style={{ color: C.accent }}>حفظ</button>
                    </div>
                  ) : (
                    <button onClick={() => startEditSalary(p)} className="font-mono text-sm" style={{ color: C.ink }}>{p.base_salary != null ? SAR(p.base_salary) : 'تحديد الراتب'}</button>
                  )}
                </td>
                <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: C.inkMuted }}>{SAR(paidFor(p.id))}</td>
                <td className="px-4 py-3 whitespace-nowrap"><button onClick={() => openPay(p)} className="text-xs font-bold px-3 py-1.5 rounded-md" style={{ background: C.accent, color: '#fff' }}>صرف راتب</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payingId && (() => {
        const p = staff.find((s) => s.id === payingId);
        if (!p) return null;
        return (
          <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <div className="font-bold text-sm" style={{ color: C.ink }}>صرف راتب — {p.display_name}</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="المبلغ"><input type="number" min="0" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
              <Field label="يُصرف من">
                <select value={payForm.accountId} onChange={(e) => setPayForm({ ...payForm, accountId: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                  <option value="">اختر...</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="الفترة (اختياري)"><input value={payForm.period} onChange={(e) => setPayForm({ ...payForm, period: e.target.value })} placeholder="مثال: يوليو 2026" className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
            </div>
            <div className="flex gap-2">
              <button onClick={() => submitPay(p)} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>تأكيد الصرف</button>
              <button onClick={() => setPayingId(null)} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>
            </div>
          </div>
        );
      })()}

      <div className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="font-bold mb-3 text-sm" style={{ color: C.ink }}>آخر عمليات الصرف</div>
        {recent.length === 0 ? <EmptyState text="لا توجد رواتب مصروفة بعد" /> : (
          <div className="space-y-2">
            {recent.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm" style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 6 }}>
                <div><span className="font-bold" style={{ color: C.ink }}>{s.staff_name}</span>{s.period && <span className="text-xs" style={{ color: C.inkMuted }}> · {s.period}</span>}</div>
                <div className="flex items-center gap-2"><span className="font-mono" style={{ color: C.critical }}>{SAR(s.amount)}</span><span className="text-xs font-mono" style={{ color: C.inkFaint }}>{fmtDate(s.created_at)}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TreasuryView({ accounts, transactions, staff, salaryPayments, chartOfAccounts, expenses, fixedAssets, accountingPeriods, bankReconciliations, actions, askConfirm, isManager, can }) {
  const [tab, setTab] = useState('accounts');
  const canExpenses = isManager || (can && can('manage_expenses'));
  const canAssets = isManager || (can && can('manage_fixed_assets'));
  const canPeriods = isManager || (can && can('close_accounting_period'));
  const canReconcile = isManager || (can && can('perform_bank_reconciliation'));
  const TABS = [
    ['accounts', 'الحسابات'],
    ['payroll', 'الرواتب'],
    ...(canExpenses ? [['expenses', 'المصروفات']] : []),
    ...(canAssets ? [['assets', 'الأصول الثابتة']] : []),
    ...(canReconcile ? [['reconciliation', 'التسوية البنكية']] : []),
    ...(canPeriods ? [['periods', 'الفترات المحاسبية']] : []),
  ];
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-2xl font-bold" style={{ color: C.ink }}>الصناديق والبنوك</div>
        <div className="flex flex-wrap rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className="px-4 py-2 text-sm font-bold" style={{ background: tab === key ? C.accent : C.surface, color: tab === key ? '#fff' : C.inkMuted }}>{label}</button>
          ))}
        </div>
      </div>
      {tab === 'accounts' && <AccountsTab accounts={accounts} transactions={transactions} chartOfAccounts={chartOfAccounts} actions={actions} askConfirm={askConfirm} isManager={isManager} />}
      {tab === 'payroll' && <PayrollTab staff={staff} accounts={accounts} salaryPayments={salaryPayments} actions={actions} />}
      {tab === 'expenses' && canExpenses && <ExpensesTab expenses={expenses} accounts={accounts} chartOfAccounts={chartOfAccounts} actions={actions} />}
      {tab === 'assets' && canAssets && <FixedAssetsTab fixedAssets={fixedAssets} accounts={accounts} chartOfAccounts={chartOfAccounts} actions={actions} askConfirm={askConfirm} />}
      {tab === 'reconciliation' && canReconcile && <ReconciliationTab accounts={accounts} transactions={transactions} bankReconciliations={bankReconciliations} actions={actions} askConfirm={askConfirm} />}
      {tab === 'periods' && canPeriods && <AccountingPeriodsTab accountingPeriods={accountingPeriods} actions={actions} askConfirm={askConfirm} isManager={isManager} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// المصروفات: تسجيل مصروف رسمي مربوط بحساب من الشجرة وقيد محاسبي تلقائي
// ---------------------------------------------------------------------------
function ExpensesTab({ expenses, accounts, chartOfAccounts, actions }) {
  const expenseAccounts = chartOfAccounts.filter((a) => a.type === 'expense' && a.is_active);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ coa_id: '', account_id: accounts[0]?.id || '', amount: '', description: '', reference: '' });
  const [error, setError] = useState('');
  const { page, setPage, totalPages, pageItems } = usePagination(expenses.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), 8);

  const submit = async () => {
    if (!form.coa_id) { setError('اختر حساب المصروف'); return; }
    if (!form.account_id) { setError('اختر الصندوق/الحساب الدافع'); return; }
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { setError('المبلغ يجب أن يكون أكبر من صفر'); return; }
    setError('');
    await actions.createExpense(form.coa_id, form.account_id, amount, form.description.trim() || null, form.reference.trim() || null);
    setForm({ coa_id: '', account_id: accounts[0]?.id || '', amount: '', description: '', reference: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>+ مصروف جديد</button>
      </div>
      {showForm && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="نوع المصروف">
              <select value={form.coa_id} onChange={(e) => setForm({ ...form, coa_id: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                <option value="">اختر...</option>
                {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
              </select>
            </Field>
            <Field label="الصندوق/الحساب الدافع">
              <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="المبلغ"><input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="مرجع (اختياري)"><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
          </div>
          <Field label="الوصف"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} placeholder="مثال: فاتورة كهرباء شهر أغسطس" /></Field>
          <ErrorNote>{error}</ErrorNote>
          <button onClick={submit} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>حفظ المصروف</button>
        </div>
      )}
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>رقم المصروف</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>التاريخ</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الوصف</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المبلغ</th>
          </tr></thead>
          <tbody>
            {pageItems.length === 0 && <tr><td colSpan={4}><EmptyState text="لا توجد مصروفات مسجّلة" /></td></tr>}
            {pageItems.map((e) => (
              <tr key={e.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="px-4 py-3 font-mono" style={{ color: C.inkMuted }}>{e.expense_number}</td>
                <td className="px-4 py-3 font-mono" style={{ color: C.inkMuted }}>{fmtDate(e.expense_date)}</td>
                <td className="px-4 py-3" style={{ color: C.ink }}>{e.description || '—'}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: C.critical }}>{SAR(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// الأصول الثابتة: تسجيل الأصل + تشغيل الإهلاك الشهري لكل الأصول دفعة واحدة
// ---------------------------------------------------------------------------
const ASSET_CATEGORIES = ['Laboratory Equipment', 'Computers', 'Furniture', 'Vehicles', 'Other'];
const ASSET_CATEGORY_LABEL = { 'Laboratory Equipment': 'معدات مختبر', 'Computers': 'أجهزة حاسوب', 'Furniture': 'أثاث', 'Vehicles': 'مركبات', 'Other': 'أخرى' };
const ASSET_CATEGORY_COA = { 'Laboratory Equipment': '1410', 'Computers': '1420', 'Furniture': '1430', 'Vehicles': '1440', 'Other': '1450' };

function FixedAssetsTab({ fixedAssets, accounts, chartOfAccounts, actions, askConfirm }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Laboratory Equipment', purchase_date: new Date().toISOString().slice(0, 10), purchase_cost: '', useful_life_years: '', residual_value: '0', account_id: accounts[0]?.id || '', location: '' });
  const [error, setError] = useState('');
  const [runningDepreciation, setRunningDepreciation] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) { setError('اسم الأصل مطلوب'); return; }
    const cost = Number(form.purchase_cost), life = Number(form.useful_life_years), residual = Number(form.residual_value) || 0;
    if (!cost || cost <= 0) { setError('تكلفة الشراء يجب أن تكون أكبر من صفر'); return; }
    if (!life || life <= 0) { setError('العمر الإنتاجي (بالسنوات) مطلوب'); return; }
    if (residual >= cost) { setError('القيمة التخريدية يجب أن تكون أقل من التكلفة'); return; }
    if (!form.account_id) { setError('اختر حساب الدفع'); return; }
    setError('');
    await actions.createFixedAsset(form.name.trim(), form.category, ASSET_CATEGORY_COA[form.category], form.purchase_date, cost, life, residual, form.account_id, form.location.trim() || null);
    setForm({ name: '', category: 'Laboratory Equipment', purchase_date: new Date().toISOString().slice(0, 10), purchase_cost: '', useful_life_years: '', residual_value: '0', account_id: accounts[0]?.id || '', location: '' });
    setShowForm(false);
  };

  const runDepreciation = () => {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    askConfirm({
      title: 'تشغيل الإهلاك الشهري',
      message: `سيتم احتساب وترحيل إهلاك شهر ${period} لكل الأصول النشطة التي لم يُحتسب إهلاكها هذا الشهر بعد. هذا الإجراء لا يمكن التراجع عنه إلا بعكس القيود يدوياً.`,
      confirmLabel: 'تشغيل الإهلاك',
      onConfirm: async () => { setRunningDepreciation(true); await actions.runMonthlyDepreciation(period); setRunningDepreciation(false); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={runDepreciation} disabled={runningDepreciation} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.accent, opacity: runningDepreciation ? 0.6 : 1 }}>{runningDepreciation ? '...جارِ الاحتساب' : 'تشغيل الإهلاك الشهري'}</button>
        <button onClick={() => setShowForm(!showForm)} className="px-3.5 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>+ أصل ثابت جديد</button>
      </div>
      {showForm && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="اسم الأصل"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} placeholder="مثال: جهاز CBC تلقائي" /></Field>
            <Field label="التصنيف">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{ASSET_CATEGORY_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field label="تاريخ الشراء"><input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="تكلفة الشراء"><input type="number" min="0" value={form.purchase_cost} onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="العمر الإنتاجي (سنوات)"><input type="number" min="1" value={form.useful_life_years} onChange={(e) => setForm({ ...form, useful_life_years: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="القيمة التخريدية"><input type="number" min="0" value={form.residual_value} onChange={(e) => setForm({ ...form, residual_value: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            <Field label="حساب الدفع">
              <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="الموقع (اختياري)"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <button onClick={submit} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>حفظ الأصل</button>
        </div>
      )}
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الكود</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الاسم</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>التصنيف</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>التكلفة</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>مجمّع الإهلاك</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>القيمة الدفترية</th>
          </tr></thead>
          <tbody>
            {fixedAssets.length === 0 && <tr><td colSpan={6}><EmptyState text="لا توجد أصول ثابتة مسجّلة" /></td></tr>}
            {fixedAssets.map((a) => (
              <tr key={a.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="px-4 py-3 font-mono" style={{ color: C.inkMuted }}>{a.asset_code}</td>
                <td className="px-4 py-3 font-bold" style={{ color: C.ink }}>{a.name}</td>
                <td className="px-4 py-3" style={{ color: C.inkMuted }}>{ASSET_CATEGORY_LABEL[a.category] || a.category}</td>
                <td className="px-4 py-3 font-mono" style={{ color: C.ink }}>{SAR(a.purchase_cost)}</td>
                <td className="px-4 py-3 font-mono" style={{ color: C.warning }}>{SAR(a.accumulated_depreciation)}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: C.accent }}>{SAR(a.purchase_cost - a.accumulated_depreciation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// الفترات المحاسبية: إغلاق/إعادة فتح فترة (بعد التحقق من توازنها)
// ---------------------------------------------------------------------------
function AccountingPeriodsTab({ accountingPeriods, actions, askConfirm, isManager }) {
  const [form, setForm] = useState({ period_name: new Date().toISOString().slice(0, 7), start_date: '', end_date: '' });
  const [error, setError] = useState('');

  const close = async () => {
    if (!form.start_date || !form.end_date) { setError('حدّد تاريخ بداية ونهاية الفترة'); return; }
    setError('');
    askConfirm({
      title: 'إغلاق فترة محاسبية',
      message: `بعد الإغلاق، لن يُسمح بأي عملية مالية جديدة بتاريخ ضمن ${form.start_date} → ${form.end_date} إلا لمن يملك صلاحية خاصة. هل أنت متأكد؟`,
      danger: true,
      confirmLabel: 'إغلاق الفترة',
      onConfirm: () => actions.closeAccountingPeriod(form.period_name, form.start_date, form.end_date),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="font-bold" style={{ color: C.ink }}>إغلاق فترة جديدة</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="اسم الفترة"><input value={form.period_name} onChange={(e) => setForm({ ...form, period_name: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} placeholder="2026-08" /></Field>
          <Field label="من تاريخ"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
          <Field label="إلى تاريخ"><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        </div>
        <ErrorNote>{error}</ErrorNote>
        <button onClick={close} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.critical, color: '#fff' }}>إغلاق الفترة</button>
      </div>
      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الفترة</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>من — إلى</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الحالة</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}></th>
          </tr></thead>
          <tbody>
            {accountingPeriods.length === 0 && <tr><td colSpan={4}><EmptyState text="لا توجد فترات مقفلة بعد" /></td></tr>}
            {accountingPeriods.map((p) => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: C.ink }}>{p.period_name}</td>
                <td className="px-4 py-3 font-mono" style={{ color: C.inkMuted }}>{p.start_date} → {p.end_date}</td>
                <td className="px-4 py-3"><Badge tone={p.status === 'closed' ? 'critical' : 'normal'}>{p.status === 'closed' ? 'مقفلة' : 'مفتوحة'}</Badge></td>
                <td className="px-4 py-3">
                  {p.status === 'closed' && isManager && <button onClick={() => askConfirm({ title: 'إعادة فتح الفترة', message: `هل تريد إعادة فتح ${p.period_name}؟`, onConfirm: () => actions.reopenAccountingPeriod(p.period_name) })} className="text-xs font-bold" style={{ color: C.accent }}>إعادة فتح</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// التسوية البنكية: بدء جلسة تسوية بمقارنة رصيد كشف الحساب مقابل حركات النظام،
// وضع علامة تحقق على كل حركة، ثم إغلاق الجلسة وعرض الفرق (إن وجد)
// ---------------------------------------------------------------------------
function ReconciliationTab({ accounts, transactions, bankReconciliations, actions, askConfirm }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [statementBalance, setStatementBalance] = useState('');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');

  const activeRec = bankReconciliations.find((r) => r.account_id === accountId && r.status === 'in_progress');
  const pastRecs = bankReconciliations.filter((r) => r.account_id === accountId && r.status === 'completed').sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  const relevantTx = activeRec
    ? transactions.filter((t) => t.account_id === accountId && t.created_at.slice(0, 10) <= activeRec.statement_date).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : [];

  const start = async () => {
    const bal = Number(statementBalance);
    if (isNaN(bal)) { setError('أدخل رصيد كشف الحساب'); return; }
    setError('');
    await actions.startBankReconciliation(accountId, statementDate, bal);
  };

  const complete = () => {
    askConfirm({
      title: 'إكمال التسوية البنكية',
      message: 'سيتم حساب رصيد الدفاتر حتى تاريخ الكشف ومقارنته برصيد الكشف. لا يمكن التراجع عن هذا الإجراء.',
      confirmLabel: 'إكمال التسوية',
      onConfirm: () => actions.completeBankReconciliation(activeRec.id, notes.trim() || null),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-4 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <Field label="الحساب">
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>

        {!activeRec ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="تاريخ كشف الحساب"><input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
              <Field label="رصيد كشف الحساب"><input type="number" value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
            </div>
            <ErrorNote>{error}</ErrorNote>
            <button onClick={start} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>بدء تسوية جديدة</button>
          </>
        ) : (
          <>
            <div className="rounded-lg px-4 py-3 text-sm font-bold" style={{ background: C.accentSoft, color: C.accentDark }}>
              جلسة تسوية جارية — حتى {fmtDate(activeRec.statement_date)} — رصيد الكشف: {SAR(activeRec.statement_balance)}
            </div>
            <div className="rounded-lg overflow-x-auto" style={{ border: `1px solid ${C.line}` }}>
              <table className="w-full text-sm">
                <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
                  <th className="text-right px-3 py-2 font-bold" style={{ color: C.inkMuted }}>التاريخ</th>
                  <th className="text-right px-3 py-2 font-bold" style={{ color: C.inkMuted }}>الوصف</th>
                  <th className="text-right px-3 py-2 font-bold" style={{ color: C.inkMuted }}>المبلغ</th>
                  <th className="text-right px-3 py-2 font-bold" style={{ color: C.inkMuted }}>مطابق للكشف</th>
                </tr></thead>
                <tbody>
                  {relevantTx.length === 0 && <tr><td colSpan={4}><EmptyState text="لا توجد حركات" /></td></tr>}
                  {relevantTx.map((t) => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td className="px-3 py-2 font-mono text-xs" style={{ color: C.inkMuted }}>{fmtDate(t.created_at)}</td>
                      <td className="px-3 py-2" style={{ color: C.ink }}>{t.description || t.category}</td>
                      <td className="px-3 py-2 font-mono font-bold" style={{ color: t.direction === 'in' ? C.normal : C.critical }}>{t.direction === 'in' ? '+' : '-'}{SAR(t.amount)}</td>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={t.reconciled} onChange={(e) => actions.toggleTransactionReconciled(t.id, activeRec.id, e.target.checked)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Field label="ملاحظات (اختياري)"><input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} placeholder="مثال: شيك لسه ما انصرف" /></Field>
            <button onClick={complete} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.critical, color: '#fff' }}>إكمال التسوية</button>
          </>
        )}
      </div>

      {pastRecs.length > 0 && (
        <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="px-4 py-3 font-bold" style={{ color: C.ink, borderBottom: `1px solid ${C.line}` }}>سجل التسويات السابقة</div>
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
              <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>تاريخ الكشف</th>
              <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>رصيد الكشف</th>
              <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>رصيد الدفاتر</th>
              <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الفرق</th>
            </tr></thead>
            <tbody>
              {pastRecs.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-3 font-mono" style={{ color: C.inkMuted }}>{fmtDate(r.statement_date)}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: C.ink }}>{SAR(r.statement_balance)}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: C.ink }}>{SAR(r.book_balance)}</td>
                  <td className="px-4 py-3 font-mono font-bold" style={{ color: Math.abs(r.difference) < 0.01 ? C.normal : C.critical }}>{SAR(r.difference)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
