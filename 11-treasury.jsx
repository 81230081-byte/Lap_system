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

function TreasuryView({ accounts, transactions, staff, salaryPayments, chartOfAccounts, actions, askConfirm, isManager }) {
  const [tab, setTab] = useState('accounts');
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-2xl font-bold" style={{ color: C.ink }}>الصناديق والبنوك</div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          <button onClick={() => setTab('accounts')} className="px-4 py-2 text-sm font-bold" style={{ background: tab === 'accounts' ? C.accent : C.surface, color: tab === 'accounts' ? '#fff' : C.inkMuted }}>الحسابات</button>
          <button onClick={() => setTab('payroll')} className="px-4 py-2 text-sm font-bold" style={{ background: tab === 'payroll' ? C.accent : C.surface, color: tab === 'payroll' ? '#fff' : C.inkMuted }}>الرواتب</button>
        </div>
      </div>
      {tab === 'accounts'
        ? <AccountsTab accounts={accounts} transactions={transactions} chartOfAccounts={chartOfAccounts} actions={actions} askConfirm={askConfirm} isManager={isManager} />
        : <PayrollTab staff={staff} accounts={accounts} salaryPayments={salaryPayments} actions={actions} />}
    </div>
  );
}
