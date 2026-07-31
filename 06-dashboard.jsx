// لوحة التحكم الرئيسية (الإحصائيات، النتائج الحرجة، نواقص المخزون)

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard({ data, setView, setActiveOrderId }) {
  const { patients, catalog, orders, invoices, inventory, auditLog } = data;
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const pendingReviewOrders = orders.filter((o) => o.status === 'pending_review');
  const collected = invoices.reduce((s, i) => s + invoicePaid(i), 0);
  const lowStock = inventory.filter((i) => i.quantity <= i.threshold);
  const expiringItems = inventory
    .map((i) => ({ item: i, exp: expiryStatus(i.expiry_date) }))
    .filter((x) => x.exp && (x.exp.level === 'expired' || x.exp.level === 'soon'))
    .sort((a, b) => a.exp.days - b.exp.days);

  const flagged = [];
  orders.filter((o) => o.status === 'completed').forEach((o) => {
    const patient = patients.find((p) => p.id === o.patient_id);
    Object.entries(o.results || {}).forEach(([testId, value]) => {
      const test = catalog.find((c) => c.id === testId);
      if (!test) return;
      const r = resolveTestRanges(test, patient);
      const status = classifyValue(value, r);
      if (status === 'abnormal' || status === 'critical') flagged.push({ patient: patient?.name, test, value, r, critical: status === 'critical' });
    });
  });
  const criticalCount = flagged.filter((f) => f.critical).length;

  return (
    <div className="p-6 space-y-6">
      <div className="text-2xl font-bold" style={{ color: C.ink }}>لوحة التحكم</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="إجمالي المرضى" value={patients.length} />
        <StatCard label="عينات قيد الانتظار" value={pendingOrders.length} tone={pendingOrders.length ? 'warning' : undefined} />
        <StatCard label="بانتظار الاعتماد" value={pendingReviewOrders.length} tone={pendingReviewOrders.length ? 'warning' : undefined} />
        <StatCard label="إيرادات محصّلة" value={SAR(collected)} />
        <StatCard label="تنبيهات المخزون" value={lowStock.length} tone={lowStock.length ? 'critical' : undefined} />
        <StatCard label="نتائج حرجة" value={criticalCount} tone={criticalCount ? 'critical' : undefined} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="font-bold mb-3" style={{ color: C.ink }}>نتائج خارج المعدل الطبيعي</div>
          {flagged.length === 0 ? <EmptyState text="لا توجد نتائج غير طبيعية حالياً" /> : (
            <div className="space-y-3">
              {flagged.slice(0, 5).map((a, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 pb-2" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <div className="min-w-0"><div className="text-sm font-bold truncate" style={{ color: C.ink }}>{a.patient}</div><div className="text-xs truncate" style={{ color: C.inkMuted }}>{a.test.name}</div></div>
                  <Flag value={a.value} min={a.r.min} max={a.r.max} critLow={a.r.critLow} critHigh={a.r.critHigh} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="font-bold mb-3" style={{ color: C.ink }}>تنبيهات المخزون</div>
          {lowStock.length === 0 ? <EmptyState text="المخزون في مستويات جيدة" /> : (
            <div className="space-y-3">
              {lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="text-sm font-bold" style={{ color: C.ink }}>{item.name}</div>
                  <div className="text-xs font-mono" style={{ color: C.critical }}>{item.quantity} / {item.threshold} {item.unit}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="font-bold mb-3" style={{ color: C.ink }}>صلاحية المخزون</div>
          {expiringItems.length === 0 ? <EmptyState text="لا توجد أصناف قاربت الانتهاء" /> : (
            <div className="space-y-3">
              {expiringItems.slice(0, 5).map(({ item, exp }) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{item.name}</div>
                  {exp.level === 'expired' ? <Badge tone="critical">منتهي منذ {Math.abs(exp.days)} يوم</Badge> : <Badge tone="warning">{exp.days} يوم متبقي</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold" style={{ color: C.ink }}>عينات قيد الانتظار</div>
            <button onClick={() => setView('orders')} className="text-sm font-bold" style={{ color: C.accent }}>عرض الكل ‹</button>
          </div>
          {pendingOrders.length === 0 ? <EmptyState text="لا توجد عينات قيد الانتظار" /> : (
            <div className="space-y-2">
              {pendingOrders.slice(0, 5).map((o) => {
                const patient = patients.find((p) => p.id === o.patient_id);
                return (
                  <div key={o.id} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <div><div className="text-sm font-bold" style={{ color: C.ink }}>{patient?.name}</div><div className="text-xs font-mono" style={{ color: C.inkMuted }}>{o.sample_id}</div></div>
                    <button onClick={() => { setActiveOrderId(o.id); setView('results'); }} className="text-sm font-bold px-3 py-1.5 rounded-md" style={{ background: C.accent, color: '#fff' }}>إدخال النتائج</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold" style={{ color: C.ink }}>بانتظار اعتماد النتائج</div>
            <button onClick={() => setView('orders')} className="text-sm font-bold" style={{ color: C.accent }}>عرض الكل ‹</button>
          </div>
          {pendingReviewOrders.length === 0 ? <EmptyState text="لا توجد نتائج بانتظار الاعتماد" /> : (
            <div className="space-y-2">
              {pendingReviewOrders.slice(0, 5).map((o) => {
                const patient = patients.find((p) => p.id === o.patient_id);
                return (
                  <div key={o.id} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <div><div className="text-sm font-bold" style={{ color: C.ink }}>{patient?.name}</div><div className="text-xs font-mono" style={{ color: C.inkMuted }}>{o.sample_id}{o.has_critical ? ' · حرج ⚠' : ''}</div></div>
                    <button onClick={() => setView('orders')} className="text-sm font-bold px-3 py-1.5 rounded-md" style={{ border: `1px solid ${C.accent}`, color: C.accent }}>مراجعة</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold" style={{ color: C.ink }}>آخر نشاط</div>
            <button onClick={() => setView('audit')} className="text-sm font-bold" style={{ color: C.accent }}>السجل الكامل ‹</button>
          </div>
          {auditLog.length === 0 ? <EmptyState text="لا يوجد نشاط بعد" /> : (
            <div className="space-y-2">
              {auditLog.slice(0, 5).map((a) => (
                <div key={a.id} className="pb-2" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <div className="text-sm font-bold" style={{ color: C.ink }}>{a.action}</div>
                  <div className="text-xs truncate" style={{ color: C.inkMuted }}>{a.details}</div>
                  <div className="text-xs font-mono" style={{ color: C.inkFaint }}>{fmtDateTime(a.created_at)} · {a.user_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
