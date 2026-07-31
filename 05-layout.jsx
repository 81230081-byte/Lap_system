// القائمة الجانبية والتنقّل الرئيسي

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
const NAV = [
  { key: 'dashboard', label: 'لوحة التحكم' },
  { key: 'appointments', label: 'المواعيد' },
  { key: 'patients', label: 'المرضى' },
  { key: 'orders', label: 'الطلبات والعينات' },
  { key: 'inventory', label: 'المخزون' },
  { key: 'qc', label: 'ضبط الجودة' },
  { key: 'suppliers', label: 'الموردين والمشتريات' },
  { key: 'treasury', label: 'الصناديق والبنوك' },
  { key: 'financial-reports', label: 'التقارير المالية' },
  { key: 'billing', label: 'الفواتير' },
  { key: 'audit', label: 'سجل التدقيق' },
  { key: 'settings', label: 'الإعدادات' },
];

const MANAGER_ONLY_NAV_KEYS = ['treasury', 'financial-reports'];

function Sidebar({ view, setView, displayName, role, isManager, labName, logoSrc, onLogout, onExport, saveError }) {
  const items = NAV.filter((item) => isManager || !MANAGER_ONLY_NAV_KEYS.includes(item.key));
  return (
    <div className="w-56 shrink-0 h-full flex flex-col" style={{ background: C.surface, borderLeft: `1px solid ${C.line}` }}>
      <div className="px-5 py-5" style={{ borderBottom: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2 mb-0.5"><img src={logoSrc || LOGO_B64} alt="شعار" style={{ height: 28, width: "auto" }} /><div className="text-lg font-bold" style={{ color: C.ink }}>{labName || 'مختبر الشموخ'}</div></div>
        <div className="text-xs" style={{ color: C.inkMuted }}>نظام إدارة المختبر</div>
      </div>
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = view === item.key;
          return (
            <button key={item.key} onClick={() => setView(item.key)} className="w-full text-right px-3 py-2.5 rounded-lg text-sm" style={{ background: active ? C.accentSoft : 'transparent', color: active ? C.accentDark : C.inkMuted, fontWeight: active ? 700 : 500 }}>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-4 py-3 space-y-2" style={{ borderTop: `1px solid ${C.line}` }}>
        <div className="text-xs" style={{ color: C.inkMuted }}>مسجّل الدخول: <span className="font-bold" style={{ color: C.ink }}>{displayName}</span> <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ background: C.accentSoft, color: C.accentDark, fontSize: 10 }}>{role}</span></div>
        <button onClick={onExport} className="w-full text-xs font-bold px-2 py-1.5 rounded-md" style={{ border: `1px solid ${C.line}`, color: C.accent }}>تصدير نسخة احتياطية</button>
        <button onClick={onLogout} className="w-full text-xs font-bold px-2 py-1.5 rounded-md" style={{ border: `1px solid ${C.line}`, color: C.critical }}>تسجيل الخروج</button>
      </div>
      {saveError && <div className="px-4 py-2 text-xs" style={{ color: C.critical }}>تعذر الاتصال بالخادم — تحقق من الإنترنت</div>}
    </div>
  );
}
