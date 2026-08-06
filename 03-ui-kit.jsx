// مكوّنات واجهة مشتركة تُستخدم في أكثر من شاشة (مؤشرات، شارات، حوارات تأكيد، الصفحات)

// ---------------------------------------------------------------------------
// Shared UI pieces
// ---------------------------------------------------------------------------
function RangeGauge({ value, min, max, critLow, critHigh }) {
  const range = max - min || 1;
  const pad = range * 0.35;
  const lo = min - pad, hi = max + pad;
  const clamp = (n) => Math.min(100, Math.max(0, n));
  const toPct = (v) => clamp(((v - lo) / (hi - lo)) * 100);
  const outOfRange = value < min || value > max;
  const isCritical = critLow !== undefined && critHigh !== undefined && (value < critLow || value > critHigh);
  const dotColor = isCritical ? C.criticalDeep : outOfRange ? C.critical : C.normal;
  return (
    <div className="w-full" style={{ minWidth: 90 }}>
      <div className="relative h-1.5 rounded-full" style={{ background: '#E4E7E1' }}>
        <div className="absolute h-1.5 rounded-full" style={{ left: `${toPct(min)}%`, width: `${Math.max(0, toPct(max) - toPct(min))}%`, background: '#BFD8C6' }} />
        <div className="absolute rounded-full" style={{ left: `${toPct(value)}%`, top: '50%', width: 10, height: 10, background: dotColor, border: '2px solid #fff', transform: 'translate(-50%,-50%)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  );
}
function Flag({ value, min, max, critLow, critHigh }) {
  if (value === '' || value === undefined || value === null || isNaN(value)) return null;
  const isCritical = critLow !== undefined && critHigh !== undefined && (value < critLow || value > critHigh);
  const isLow = value < min, isHigh = value > max;
  if (isCritical) return <span className="inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: '#fff', background: C.criticalDeep }}>⚠ حرج {isLow ? '(منخفض جداً)' : '(مرتفع جداً)'}</span>;
  if (isLow) return <span className="text-xs font-bold" style={{ color: C.critical }}>منخفض</span>;
  if (isHigh) return <span className="text-xs font-bold" style={{ color: C.critical }}>مرتفع</span>;
  return <span className="text-xs font-bold" style={{ color: C.normal }}>طبيعي</span>;
}
// مؤشر حالة مخصص للتقرير المطبوع (يُسلَّم للمريض): يوضّح الاتجاه والأولوية بشكل يفهمه المختص
// دون استخدام ألفاظ مقلقة مباشرة أمام المريض مثل "منخفض جداً" أو "خطير".
function ReportFlag({ value, min, max, critLow, critHigh }) {
  if (value === '' || value === undefined || value === null || isNaN(value)) return <span style={{ color: C.inkFaint }}>—</span>;
  const isCritical = critLow !== undefined && critHigh !== undefined && (value < critLow || value > critHigh);
  const isLow = value < min, isHigh = value > max;
  if (isCritical) {
    return <span className="inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: '#fff', background: C.criticalDeep }}>{isLow ? '⇓' : '⇑'} يستدعي مراجعة الطبيب</span>;
  }
  if (isLow) return <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: C.critical }}>↓ خارج المعدل</span>;
  if (isHigh) return <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: C.critical }}>↑ خارج المعدل</span>;
  return <span className="text-xs font-bold" style={{ color: C.normal }}>✓ ضمن المعدل</span>;
}
function StatCard({ label, value, tone }) {
  const toneColor = tone === 'critical' ? C.critical : tone === 'warning' ? C.warning : C.accent;
  return (
    <div className="rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="text-xs" style={{ color: C.inkMuted }}>{label}</div>
      <div className="text-xl font-bold font-mono mt-1" style={{ color: toneColor }}>{value}</div>
    </div>
  );
}
function Badge({ tone, children }) {
  const map = { normal: [C.normalSoft, C.normal], warning: [C.warningSoft, C.warning], critical: [C.criticalSoft, C.critical], accent: [C.accentSoft, C.accent], muted: [C.muted, C.inkMuted] };
  const [bg, fg] = map[tone] || map.accent;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap" style={{ background: bg, color: fg }}>{children}</span>;
}
function EmptyState({ text }) {
  return <div className="flex flex-col items-center justify-center py-10 text-center text-sm" style={{ color: C.inkFaint }}>{text}</div>;
}
function Field({ label, children }) {
  return <div><div className="text-xs font-bold mb-1" style={{ color: C.inkMuted }}>{label}</div>{children}</div>;
}
function ErrorNote({ children }) {
  if (!children) return null;
  return <div className="text-xs font-bold px-3 py-2 rounded-md" style={{ background: C.criticalSoft, color: C.critical }}>{children}</div>;
}
function ConfirmDialog({ state, onCancel }) {
  if (!state || !state.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(28,38,34,0.45)' }}>
      <div className="w-full max-w-sm rounded-lg p-5" style={{ background: C.surface }}>
        <div className="font-bold text-base mb-2" style={{ color: C.ink }}>{state.title}</div>
        <div className="text-sm mb-5" style={{ color: C.inkMuted }}>{state.message}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3.5 py-2 rounded-md text-sm font-bold" style={{ color: C.inkMuted, border: `1px solid ${C.line}` }}>إلغاء</button>
          <button onClick={() => { state.onConfirm(); onCancel(); }} className="px-3.5 py-2 rounded-md text-sm font-bold" style={{ background: state.danger ? C.critical : C.accent, color: '#fff' }}>{state.confirmLabel || 'تأكيد'}</button>
        </div>
      </div>
    </div>
  );
}
function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto max-w-md w-full rounded-lg px-4 py-3 shadow-lg text-sm font-bold flex items-start gap-3" style={{ background: isError ? C.criticalSoft : C.normalSoft, color: isError ? C.critical : C.normal, border: `1px solid ${isError ? C.critical : C.normal}` }}>
        <span className="flex-1">{toast.message}</span>
        <button onClick={onDismiss} className="font-bold leading-none" style={{ color: 'inherit' }}>×</button>
      </div>
    </div>
  );
}
function RejectDialog({ order, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(28,38,34,0.45)' }}>
      <div className="w-full max-w-sm rounded-lg p-5" style={{ background: C.surface }}>
        <div className="font-bold text-base mb-2" style={{ color: C.ink }}>إرجاع النتائج لإعادة الإدخال</div>
        <div className="text-sm mb-3" style={{ color: C.inkMuted }}>الطلب {order.sample_id} — وضّح السبب (اختياري) ليتمكن الفني من التصحيح:</div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md text-sm mb-4" style={inputStyle} placeholder="مثال: قيمة غير منطقية، يُرجى إعادة الفحص" />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3.5 py-2 rounded-md text-sm font-bold" style={{ color: C.inkMuted, border: `1px solid ${C.line}` }}>إلغاء</button>
          <button onClick={() => onConfirm(reason)} className="px-3.5 py-2 rounded-md text-sm font-bold" style={{ background: C.critical, color: '#fff' }}>إرجاع النتائج</button>
        </div>
      </div>
    </div>
  );
}
function usePagination(items, perPage, resetKey) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [resetKey]);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const clamped = Math.min(page, totalPages);
  const start = (clamped - 1) * perPage;
  return { page: clamped, setPage, totalPages, pageItems: items.slice(start, start + perPage) };
}
function PaginationBar({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${C.line}` }}>
      <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="text-xs font-bold" style={{ color: C.accent, opacity: page <= 1 ? 0.35 : 1 }}>‹ السابق</button>
      <div className="text-xs font-mono" style={{ color: C.inkMuted }}>صفحة {page} من {totalPages}</div>
      <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="text-xs font-bold" style={{ color: C.accent, opacity: page >= totalPages ? 0.35 : 1 }}>التالي ›</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// حاجز الأخطاء (Error Boundary): يمنع أي خطأ برمجي غير متوقع من تفضية الشاشة
// بالكامل. يعرض رسالة واضحة وزر "إعادة تحميل" بدل شاشة بيضاء صامتة.
// ---------------------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('حدث خطأ غير متوقع بالواجهة:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="h-screen w-full flex items-center justify-center p-4" style={{ background: C.bg }}>
          <div className="w-full max-w-md rounded-lg p-6 text-center" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <div className="text-3xl mb-2">⚠️</div>
            <div className="text-lg font-bold mb-2" style={{ color: C.ink }}>حدث خطأ غير متوقع بهذا الجزء من الشاشة</div>
            <div className="text-sm mb-4" style={{ color: C.inkMuted }}>لا داعي للقلق — بياناتك المحفوظة بالنظام لم تتأثر. حاول إعادة تحميل الصفحة.</div>
            <button onClick={() => window.location.reload()} className="px-4 py-2.5 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>إعادة تحميل الصفحة</button>
            <div className="text-xs mt-4 font-mono text-left dir-ltr" style={{ color: C.inkFaint, wordBreak: 'break-word' }}>{String(this.state.error?.message || this.state.error || '')}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// رسوم بيانية خفيفة بـ SVG (بدون مكتبات خارجية) لعرضها في لوحة تحكم المدير
// ---------------------------------------------------------------------------
function BarChart({ data, height = 180, valueFormatter, barColor }) {
  // data: [{ label, value }]
  const max = Math.max(1, ...data.map((d) => d.value));
  const color = barColor || C.accent;
  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * (height - 24));
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.label}: ${valueFormatter ? valueFormatter(d.value) : d.value}`}>
              <div className="text-[10px] font-mono mb-1" style={{ color: C.inkMuted, opacity: d.value ? 1 : 0 }}>{valueFormatter ? valueFormatter(d.value) : d.value}</div>
              <div className="w-full rounded-t-md transition-all" style={{ height: h, background: color, minWidth: 8 }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-1.5">
        {data.map((d, i) => <div key={i} className="flex-1 text-center text-[10px] font-bold" style={{ color: C.inkMuted }}>{d.label}</div>)}
      </div>
    </div>
  );
}

function LineChart({ data, height = 160, valueFormatter, lineColor }) {
  // data: [{ label, value }]
  const width = 100; // percentage-based viewBox
  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const range = max - min || 1;
  const color = lineColor || C.accent;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = data.length > 1 ? i * stepX : width / 2;
    const y = height - 20 - ((d.value - min) / range) * (height - 40);
    return { x, y, ...d };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.6" fill={color} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="flex gap-2 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="text-[10px] font-mono" style={{ color: C.inkMuted }}>{valueFormatter ? valueFormatter(d.value) : d.value}</div>
            <div className="text-[10px] font-bold" style={{ color: C.inkFaint }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
