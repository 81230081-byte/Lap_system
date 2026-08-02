// دفتر الأستاذ والميزانية العمومية وشجرة الحسابات وكشف حساب الموردين وتقرير المشتريات

function SupplierStatementsTab({ suppliers, purchases }) {
  const [supplierId, setSupplierId] = useState('');
  const supplier = suppliers.find((s) => s.id === supplierId);
  const supplierPurchases = purchases.filter((p) => p.supplier_id === supplierId);

  const rows = [];
  supplierPurchases.forEach((p) => {
    rows.push({ date: p.created_at, label: `فاتورة شراء${p.invoice_no ? ' رقم ' + p.invoice_no : ''}`, credit: Number(p.total_amount), debit: 0 });
    (p.purchase_payments || []).forEach((pay) => {
      rows.push({ date: pay.created_at, label: `دفعة (${pay.method})`, credit: 0, debit: Number(pay.amount) });
    });
  });
  rows.sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const rowsWithBalance = rows.map((r) => { running += r.credit - r.debit; return { ...r, balance: running }; });
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 no-print">
        <Field label="اختر المورد">
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-64 px-3 py-2 rounded-md text-sm" style={inputStyle}>
            <option value="">اختر مورداً...</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        {supplierId && <button onClick={() => window.print()} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>طباعة</button>}
      </div>

      {!supplierId ? <EmptyState text="اختر مورداً لعرض كشف حسابه" /> : (
        <div id="report-area" className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
            <div className="text-lg font-bold" style={{ color: C.ink }}>كشف حساب: {supplier?.name}</div>
            <div className="text-xs font-mono" style={{ color: C.inkMuted }}>{supplier?.phone || ''}</div>
          </div>
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>التاريخ</th>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>البيان</th>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>مدين (دفعنا)</th>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>دائن (علينا)</th>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>الرصيد المستحق</th>
            </tr></thead>
            <tbody>
              {rowsWithBalance.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap" style={{ color: C.inkMuted }}>{fmtDate(r.date)}</td>
                  <td className="px-4 py-2.5" style={{ color: C.ink }}>{r.label}</td>
                  <td className="px-4 py-2.5 font-mono" style={{ color: C.normal }}>{r.debit ? SAR(r.debit) : '—'}</td>
                  <td className="px-4 py-2.5 font-mono" style={{ color: C.critical }}>{r.credit ? SAR(r.credit) : '—'}</td>
                  <td className="px-4 py-2.5 font-mono font-bold" style={{ color: C.ink }}>{SAR(r.balance)}</td>
                </tr>
              ))}
              {rowsWithBalance.length === 0 && <tr><td colSpan={5}><EmptyState text="لا توجد حركات مع هذا المورد" /></td></tr>}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${C.line}`, background: C.bg }}>
                <td colSpan={2} className="px-4 py-3 font-bold" style={{ color: C.ink }}>الإجمالي</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: C.normal }}>{SAR(totalDebit)}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: C.critical }}>{SAR(totalCredit)}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: C.ink }}>{SAR(totalCredit - totalDebit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// تقرير المشتريات
// ---------------------------------------------------------------------------
function PurchasesReportTab({ purchases, suppliers }) {
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  let filtered = purchases;
  if (supplierFilter) filtered = filtered.filter((p) => p.supplier_id === supplierFilter);
  if (dateFrom) filtered = filtered.filter((p) => new Date(p.created_at) >= new Date(dateFrom));
  if (dateTo) filtered = filtered.filter((p) => new Date(p.created_at) <= new Date(dateTo + 'T23:59:59'));

  const totalAmount = filtered.reduce((s, p) => s + Number(p.total_amount), 0);
  const totalPaid = filtered.reduce((s, p) => s + purchasePaid(p), 0);
  const totalRemaining = totalAmount - totalPaid;

  const bySupplier = {};
  filtered.forEach((p) => {
    const name = suppliers.find((s) => s.id === p.supplier_id)?.name || '—';
    bySupplier[name] = (bySupplier[name] || 0) + Number(p.total_amount);
  });

  const byItem = {};
  filtered.forEach((p) => {
    (p.items || []).forEach((it) => {
      const key = it.item_name || 'صنف';
      if (!byItem[key]) byItem[key] = { qty: 0, cost: 0 };
      byItem[key].qty += Number(it.quantity);
      byItem[key].cost += Number(it.quantity) * Number(it.unit_cost);
    });
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 no-print">
        <Field label="المورد">
          <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="px-3 py-2 rounded-md text-sm" style={inputStyle}>
            <option value="">كل الموردين</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="من تاريخ"><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        <Field label="إلى تاريخ"><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>تصدير PDF / طباعة</button>
      </div>

      <div id="report-area" className="space-y-4">
        <div className="hidden print:block mb-1">
          <div className="text-lg font-bold" style={{ color: C.ink }}>مختبر الشموخ — تقرير المشتريات</div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="إجمالي المشتريات" value={SAR(totalAmount)} />
        <StatCard label="المدفوع" value={SAR(totalPaid)} />
        <StatCard label="المتبقي (مستحق للموردين)" value={SAR(totalRemaining)} tone={totalRemaining ? 'critical' : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="px-4 py-3 text-sm font-bold" style={{ borderBottom: `1px solid ${C.line}`, color: C.ink }}>حسب المورد</div>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(bySupplier).sort((a, b) => b[1] - a[1]).map(([name, amt]) => (
                <tr key={name} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2" style={{ color: C.ink }}>{name}</td>
                  <td className="px-4 py-2 font-mono text-left" style={{ color: C.ink }}>{SAR(amt)}</td>
                </tr>
              ))}
              {Object.keys(bySupplier).length === 0 && <tr><td colSpan={2}><EmptyState text="لا توجد بيانات" /></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="px-4 py-3 text-sm font-bold" style={{ borderBottom: `1px solid ${C.line}`, color: C.ink }}>حسب الصنف</div>
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
              <th className="text-right px-4 py-2 font-bold" style={{ color: C.inkMuted }}>الصنف</th>
              <th className="text-right px-4 py-2 font-bold" style={{ color: C.inkMuted }}>الكمية</th>
              <th className="text-right px-4 py-2 font-bold" style={{ color: C.inkMuted }}>التكلفة</th>
            </tr></thead>
            <tbody>
              {Object.entries(byItem).sort((a, b) => b[1].cost - a[1].cost).map(([name, v]) => (
                <tr key={name} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2" style={{ color: C.ink }}>{name}</td>
                  <td className="px-4 py-2 font-mono" style={{ color: C.inkMuted }}>{v.qty}</td>
                  <td className="px-4 py-2 font-mono" style={{ color: C.ink }}>{SAR(v.cost)}</td>
                </tr>
              ))}
              {Object.keys(byItem).length === 0 && <tr><td colSpan={3}><EmptyState text="لا توجد بيانات" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المورد</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>التاريخ</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>رقم الفاتورة</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>الإجمالي</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المدفوع</th>
            <th className="text-right px-4 py-3 font-bold" style={{ color: C.inkMuted }}>المتبقي</th>
          </tr></thead>
          <tbody>
            {filtered.slice().reverse().map((p) => {
              const paid = purchasePaid(p);
              return (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2.5 font-bold whitespace-nowrap" style={{ color: C.ink }}>{suppliers.find((s) => s.id === p.supplier_id)?.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap" style={{ color: C.inkMuted }}>{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap" style={{ color: C.inkMuted }}>{p.invoice_no || '—'}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: C.ink }}>{SAR(p.total_amount)}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: C.normal }}>{SAR(paid)}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: paid < p.total_amount ? C.critical : C.inkMuted }}>{SAR(Math.max(0, p.total_amount - paid))}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6}><EmptyState text="لا توجد فواتير شراء مطابقة" /></td></tr>}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ميزان المراجعة وبيان الدخل (مبني على القيود المرتبطة بالشجرة المحاسبية)
// ---------------------------------------------------------------------------
function GeneralLedgerTab({ journalLines, chartOfAccounts }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedCoa, setExpandedCoa] = useState(null);

  let filtered = journalLines;
  if (dateFrom) filtered = filtered.filter((l) => l.journal_entries?.entry_date >= dateFrom);
  if (dateTo) filtered = filtered.filter((l) => l.journal_entries?.entry_date <= dateTo);

  const postableCoa = chartOfAccounts.filter((a) => a.type === 'revenue' || a.type === 'expense');
  const netByCoa = {};
  postableCoa.forEach((a) => { netByCoa[a.id] = 0; });
  filtered.forEach((l) => { if (netByCoa[l.coa_id] !== undefined) netByCoa[l.coa_id] += Number(l.credit) - Number(l.debit); });
  // للإيرادات: دائن يزيد الحساب (موجب طبيعي). للمصروفات: مدين يزيد الحساب، لذا نعكس الإشارة لعرضه كرقم موجب مصروف.

  const revenueAccounts = postableCoa.filter((a) => a.type === 'revenue');
  const expenseAccounts = postableCoa.filter((a) => a.type === 'expense');
  const totalRevenue = revenueAccounts.reduce((s, a) => s + netByCoa[a.id], 0);
  const totalExpense = expenseAccounts.reduce((s, a) => s - netByCoa[a.id], 0);
  const netResult = totalRevenue - totalExpense;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 no-print">
        <Field label="من تاريخ"><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        <Field label="إلى تاريخ"><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>طباعة</button>
      </div>

      <div id="report-area" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="إجمالي الإيرادات (مستحقة)" value={SAR(totalRevenue)} />
          <StatCard label="إجمالي المصروفات" value={SAR(totalExpense)} />
          <StatCard label="صافي النتيجة" value={SAR(netResult)} tone={netResult < 0 ? 'critical' : undefined} />
        </div>

        <div className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
            <div className="text-lg font-bold" style={{ color: C.ink }}>بيان الدخل (Income Statement) — أساس الاستحقاق</div>
            <div className="text-xs" style={{ color: C.inkMuted }}>الإيراد يُسجَّل عند إصدار الفاتورة، والمصروف عند حدوثه — وليس عند حركة النقد فقط</div>
          </div>
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>الرمز</th>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>الحساب</th>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>عدد القيود</th>
              <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>الإجمالي</th>
            </tr></thead>
            <tbody>
              <tr style={{ background: C.bg }}><td colSpan={4} className="px-4 py-2 text-xs font-bold" style={{ color: C.normal }}>الإيرادات</td></tr>
              {revenueAccounts.map((a) => {
                const lines = filtered.filter((l) => l.coa_id === a.id);
                return (
                  <React.Fragment key={a.id}>
                    <tr style={{ borderBottom: `1px solid ${C.line}`, cursor: 'pointer' }} onClick={() => setExpandedCoa(expandedCoa === a.id ? null : a.id)}>
                      <td className="px-4 py-2 font-mono" style={{ color: C.inkMuted }}>{a.code}</td>
                      <td className="px-4 py-2" style={{ color: C.ink }}>{a.name_ar}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: C.inkMuted }}>{lines.length}</td>
                      <td className="px-4 py-2 font-mono font-bold" style={{ color: C.normal }}>{SAR(netByCoa[a.id])}</td>
                    </tr>
                    {expandedCoa === a.id && lines.map((l) => (
                      <tr key={l.id} style={{ background: C.bg }}>
                        <td></td>
                        <td className="px-4 py-1.5 text-xs" style={{ color: C.inkMuted }} colSpan={2}>{fmtDate(l.journal_entries?.entry_date)} — {l.journal_entries?.description}</td>
                        <td className="px-4 py-1.5 font-mono text-xs" style={{ color: C.inkMuted }}>{SAR(Number(l.credit) - Number(l.debit))}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              <tr style={{ background: C.bg }}><td colSpan={4} className="px-4 py-2 text-xs font-bold" style={{ color: C.critical }}>المصروفات</td></tr>
              {expenseAccounts.map((a) => {
                const lines = filtered.filter((l) => l.coa_id === a.id);
                return (
                  <React.Fragment key={a.id}>
                    <tr style={{ borderBottom: `1px solid ${C.line}`, cursor: 'pointer' }} onClick={() => setExpandedCoa(expandedCoa === a.id ? null : a.id)}>
                      <td className="px-4 py-2 font-mono" style={{ color: C.inkMuted }}>{a.code}</td>
                      <td className="px-4 py-2" style={{ color: C.ink }}>{a.name_ar}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: C.inkMuted }}>{lines.length}</td>
                      <td className="px-4 py-2 font-mono font-bold" style={{ color: C.critical }}>{SAR(-netByCoa[a.id])}</td>
                    </tr>
                    {expandedCoa === a.id && lines.map((l) => (
                      <tr key={l.id} style={{ background: C.bg }}>
                        <td></td>
                        <td className="px-4 py-1.5 text-xs" style={{ color: C.inkMuted }} colSpan={2}>{fmtDate(l.journal_entries?.entry_date)} — {l.journal_entries?.description}</td>
                        <td className="px-4 py-1.5 font-mono text-xs" style={{ color: C.inkMuted }}>{SAR(Number(l.debit) - Number(l.credit))}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${C.line}`, background: C.bg }}>
                <td colSpan={3} className="px-4 py-3 font-bold" style={{ color: C.ink }}>صافي النتيجة (إيرادات − مصروفات)</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: netResult < 0 ? C.critical : C.normal }}>{SAR(netResult)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// قائمة المركز المالي (Balance Sheet) — الأصول = الالتزامات + حقوق الملكية
// ---------------------------------------------------------------------------
function BalanceSheetTab({ journalLines, chartOfAccounts, accounts }) {
  const [asOf, setAsOf] = useState('');
  let filtered = journalLines;
  if (asOf) filtered = filtered.filter((l) => l.journal_entries?.entry_date <= asOf);

  // الرصيد الطبيعي: للأصول والمصروفات مدين موجب (debit-credit)، للالتزامات وحقوق الملكية والإيرادات دائن موجب (credit-debit)
  const balanceOf = (coaId, type) => {
    const lines = filtered.filter((l) => l.coa_id === coaId);
    const debit = lines.reduce((s, l) => s + Number(l.debit), 0);
    const credit = lines.reduce((s, l) => s + Number(l.credit), 0);
    return (type === 'asset' || type === 'expense') ? debit - credit : credit - debit;
  };

  const assetAccounts = chartOfAccounts.filter((a) => a.type === 'asset' && (a.code === '1200' || a.code === '1300' || accounts.some((acc) => acc.coa_id === a.id)));
  const liabilityAccounts = chartOfAccounts.filter((a) => a.type === 'liability');
  const equityAccounts = chartOfAccounts.filter((a) => a.type === 'equity');

  // صافي نتيجة الأعمال المتراكم (أرباح محتجزة) = إجمالي الإيرادات - إجمالي المصروفات حتى تاريخه
  const revenueTotal = chartOfAccounts.filter((a) => a.type === 'revenue').reduce((s, a) => s + balanceOf(a.id, 'revenue'), 0);
  const expenseTotal = chartOfAccounts.filter((a) => a.type === 'expense').reduce((s, a) => s + balanceOf(a.id, 'expense'), 0);
  const retainedEarnings = revenueTotal - expenseTotal;

  const totalAssets = assetAccounts.reduce((s, a) => s + balanceOf(a.id, 'asset'), 0);
  const totalLiabilities = liabilityAccounts.reduce((s, a) => s + balanceOf(a.id, 'liability'), 0);
  const totalEquity = equityAccounts.reduce((s, a) => s + balanceOf(a.id, 'equity'), 0) + retainedEarnings;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 no-print">
        <Field label="كما في تاريخ (اتركه فارغاً للحالة الآن)"><input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>طباعة</button>
      </div>

      <div id="report-area" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="px-4 py-3 text-sm font-bold" style={{ borderBottom: `1px solid ${C.line}`, color: C.ink }}>الأصول</div>
          <table className="w-full text-sm">
            <tbody>
              {assetAccounts.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: C.inkMuted }}>{a.code}</td>
                  <td className="px-4 py-2" style={{ color: C.ink }}>{a.name_ar}</td>
                  <td className="px-4 py-2 font-mono text-left" style={{ color: C.ink }}>{SAR(balanceOf(a.id, 'asset'))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{ borderTop: `2px solid ${C.line}`, background: C.bg }}>
              <td colSpan={2} className="px-4 py-3 font-bold" style={{ color: C.ink }}>إجمالي الأصول</td>
              <td className="px-4 py-3 font-mono font-bold text-left" style={{ color: C.ink }}>{SAR(totalAssets)}</td>
            </tr></tfoot>
          </table>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <div className="px-4 py-3 text-sm font-bold" style={{ borderBottom: `1px solid ${C.line}`, color: C.ink }}>الالتزامات</div>
            <table className="w-full text-sm">
              <tbody>
                {liabilityAccounts.map((a) => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-4 py-2 font-mono text-xs" style={{ color: C.inkMuted }}>{a.code}</td>
                    <td className="px-4 py-2" style={{ color: C.ink }}>{a.name_ar}</td>
                    <td className="px-4 py-2 font-mono text-left" style={{ color: C.ink }}>{SAR(balanceOf(a.id, 'liability'))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr style={{ borderTop: `1px solid ${C.line}`, background: C.bg }}>
                <td colSpan={2} className="px-4 py-2 font-bold text-sm" style={{ color: C.ink }}>إجمالي الالتزامات</td>
                <td className="px-4 py-2 font-mono font-bold text-left" style={{ color: C.ink }}>{SAR(totalLiabilities)}</td>
              </tr></tfoot>
            </table>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <div className="px-4 py-3 text-sm font-bold" style={{ borderBottom: `1px solid ${C.line}`, color: C.ink }}>حقوق الملكية</div>
            <table className="w-full text-sm">
              <tbody>
                {equityAccounts.map((a) => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-4 py-2 font-mono text-xs" style={{ color: C.inkMuted }}>{a.code}</td>
                    <td className="px-4 py-2" style={{ color: C.ink }}>{a.name_ar}</td>
                    <td className="px-4 py-2 font-mono text-left" style={{ color: C.ink }}>{SAR(balanceOf(a.id, 'equity'))}</td>
                  </tr>
                ))}
                <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: C.inkMuted }}>—</td>
                  <td className="px-4 py-2" style={{ color: C.ink }}>الأرباح المحتجزة (صافي نتيجة الأعمال)</td>
                  <td className="px-4 py-2 font-mono text-left" style={{ color: retainedEarnings < 0 ? C.critical : C.ink }}>{SAR(retainedEarnings)}</td>
                </tr>
              </tbody>
              <tfoot><tr style={{ borderTop: `1px solid ${C.line}`, background: C.bg }}>
                <td colSpan={2} className="px-4 py-2 font-bold text-sm" style={{ color: C.ink }}>إجمالي حقوق الملكية</td>
                <td className="px-4 py-2 font-mono font-bold text-left" style={{ color: C.ink }}>{SAR(totalEquity)}</td>
              </tr></tfoot>
            </table>
          </div>
          <div className="rounded-lg p-4 flex items-center justify-between" style={{ background: totalAssets.toFixed(2) === (totalLiabilities + totalEquity).toFixed(2) ? C.accentSoft : '#FDECEC', border: `1px solid ${C.line}` }}>
            <span className="text-sm font-bold" style={{ color: C.ink }}>الالتزامات + حقوق الملكية</span>
            <span className="font-mono font-bold" style={{ color: C.ink }}>{SAR(totalLiabilities + totalEquity)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


const COA_TYPE_LABEL = { asset: 'أصول', liability: 'التزامات', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات' };
function ChartOfAccountsTab({ chartOfAccounts, actions }) {
  const blank = { code: '', name_ar: '', name_en: '', type: 'asset', parent_id: '' };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const resetForm = () => { setForm(blank); setEditingId(null); setError(''); };
  const startEdit = (a) => { setEditingId(a.id); setForm({ code: a.code, name_ar: a.name_ar, name_en: a.name_en || '', type: a.type, parent_id: a.parent_id || '' }); setError(''); };

  const submit = async () => {
    if (!form.code.trim() || !form.name_ar.trim()) { setError('الرمز والاسم مطلوبان'); return; }
    const payload = { code: form.code.trim(), name_ar: form.name_ar.trim(), name_en: form.name_en.trim() || null, type: form.type, parent_id: form.parent_id || null };
    if (editingId) await actions.updateCoaAccount(editingId, payload); else await actions.addCoaAccount(payload);
    resetForm();
  };
  const onDelete = (a) => {
    if (chartOfAccounts.some((c) => c.parent_id === a.id)) { setError(`لا يمكن حذف "${a.name_ar}" — يحتوي على حسابات فرعية`); return; }
    actions.deleteCoaAccount(a.id, a.name_ar);
  };

  const roots = chartOfAccounts.filter((a) => !a.parent_id).sort((x, y) => x.code.localeCompare(y.code));
  const childrenOf = (id) => chartOfAccounts.filter((a) => a.parent_id === id).sort((x, y) => x.code.localeCompare(y.code));

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-4 space-y-3 no-print" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Field label="الرمز"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm font-mono" style={inputStyle} /></Field>
          <Field label="الاسم (عربي)"><input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
          <Field label="الاسم (إنجليزي)"><input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} /></Field>
          <Field label="النوع">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
              {Object.entries(COA_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="الحساب الأب (اختياري)">
            <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle}>
              <option value="">— حساب رئيسي —</option>
              {chartOfAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name_ar}</option>)}
            </select>
          </Field>
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex gap-2">
          <button onClick={submit} className="px-4 py-2 rounded-md text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>{editingId ? 'حفظ التعديلات' : 'إضافة حساب'}</button>
          {editingId && <button onClick={resetForm} className="px-4 py-2 rounded-md text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}>إلغاء</button>}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>الرمز</th>
            <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>الاسم</th>
            <th className="text-right px-4 py-2.5 font-bold" style={{ color: C.inkMuted }}>النوع</th>
            <th></th>
          </tr></thead>
          <tbody>
            {roots.map((root) => (
              <React.Fragment key={root.id}>
                <tr style={{ borderBottom: `1px solid ${C.line}`, background: C.bg }}>
                  <td className="px-4 py-2.5 font-mono font-bold" style={{ color: C.ink }}>{root.code}</td>
                  <td className="px-4 py-2.5 font-bold" style={{ color: C.ink }}>{root.name_ar}{root.name_en ? <span className="font-normal text-xs" style={{ color: C.inkMuted }}> — {root.name_en}</span> : ''}</td>
                  <td className="px-4 py-2.5"><Badge tone="accent">{COA_TYPE_LABEL[root.type]}</Badge></td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><div className="flex items-center gap-3"><button onClick={() => startEdit(root)} className="text-xs font-bold" style={{ color: C.accent }}>تعديل</button><button onClick={() => onDelete(root)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button></div></td>
                </tr>
                {childrenOf(root.id).map((child) => (
                  <tr key={child.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-4 py-2.5 font-mono pr-8" style={{ color: C.inkMuted }}>{child.code}</td>
                    <td className="px-4 py-2.5 pr-8" style={{ color: C.ink }}>↳ {child.name_ar}{child.name_en ? <span className="text-xs" style={{ color: C.inkMuted }}> — {child.name_en}</span> : ''}</td>
                    <td className="px-4 py-2.5"><Badge tone="accent">{COA_TYPE_LABEL[child.type]}</Badge></td>
                    <td className="px-4 py-2.5 whitespace-nowrap"><div className="flex items-center gap-3"><button onClick={() => startEdit(child)} className="text-xs font-bold" style={{ color: C.accent }}>تعديل</button><button onClick={() => onDelete(child)} className="text-xs font-bold" style={{ color: C.critical }}>حذف</button></div></td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
            {roots.length === 0 && <tr><td colSpan={4}><EmptyState text="لا توجد حسابات بعد" /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
