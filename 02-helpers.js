// دوال مساعدة عامة (تنسيق العملة/التاريخ، تصنيف نتائج الفحوصات، حالة الفواتير)

const SAR = (n) => `${Number(n || 0).toLocaleString('ar-EG-u-nu-latn')} ر.ي`;
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const PHONE_RE = /^[\d\s+()-]{7,}$/;
const QUALITATIVE_LABEL = { Positive: 'إيجابي', Negative: 'سلبي' };

function friendlyError(error) {
  if (!error) return 'حدث خطأ غير متوقع، حاول مرة أخرى';
  const code = error.code || '';
  const msg = error.message || '';
  if (code === '42501' || /row-level security/i.test(msg)) return 'ليس لديك صلاحية لتنفيذ هذه العملية';
  if (code === '23505') return 'هذا العنصر مسجّل مسبقاً';
  if (code === '23503') return 'لا يمكن تنفيذ هذا — العنصر مرتبط ببيانات أخرى';
  if (code === '23514') return 'القيمة المدخلة غير صالحة';
  if (/failed to fetch|network/i.test(msg)) return 'تعذر الاتصال بالخادم — تحقق من الإنترنت';
  return msg || 'فشلت العملية، حاول مرة أخرى';
}
const inputStyle = { border: `1px solid ${C.line}` };

function resolveTestRanges(test, patient) {
  const useFemale = patient && patient.gender === 'أنثى' && test.min_female !== null && test.min_female !== undefined;
  const min = useFemale ? test.min_female : test.min;
  const max = useFemale ? test.max_female : test.max;
  const span = (test.max - test.min) || 1;
  const critLow = (test.critical_low !== null && test.critical_low !== undefined) ? test.critical_low : min - span * 0.5;
  const critHigh = (test.critical_high !== null && test.critical_high !== undefined) ? test.critical_high : max + span * 0.5;
  return { min, max, critLow, critHigh };
}
function classifyValue(value, r) {
  if (value === '' || value === undefined || value === null || isNaN(value)) return null;
  if (value < r.critLow || value > r.critHigh) return 'critical';
  if (value < r.min || value > r.max) return 'abnormal';
  return 'normal';
}
// تصنيف موحّد يدعم الفحوصات الرقمية والفحوصات ذات القيم النوعية (إيجابي/سلبي)
function classifyResult(value, test, patient) {
  if (value === '' || value === undefined || value === null) return null;
  if (test && test.value_type === 'qualitative') {
    if (!test.qualitative_abnormal_value) return null;
    return value === test.qualitative_abnormal_value ? 'abnormal' : 'normal';
  }
  if (isNaN(value)) return null;
  return classifyValue(Number(value), resolveTestRanges(test, patient));
}
function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr); exp.setHours(0, 0, 0, 0);
  const days = Math.round((exp - today) / 86400000);
  if (days < 0) return { level: 'expired', days };
  if (days <= 30) return { level: 'soon', days };
  return { level: 'ok', days };
}
const CATEGORY_ORDER = ['Hematology (CBC)', 'Urinalysis', 'Stool Analysis', 'Liver Function Tests (LFT)', 'Kidney Function Tests (KFT)', 'Lipid Profile', 'Diabetes & Glucose', 'Thyroid Function', 'Electrolytes', 'Iron Studies & Vitamins', 'Pancreatic Function', 'Cardiac & Inflammation Markers', 'Hormones', 'Tumor Markers', 'Immunology & Rheumatology', 'Serology & Infectious Disease', 'Coagulation', 'Other'];
function groupByCategory(tests) {
  const map = {};
  tests.forEach((t) => { const cat = t.category || 'Other'; (map[cat] = map[cat] || []).push(t); });
  const cats = Object.keys(map).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return cats.map((c) => [c, map[c]]);
}
function invoicePaid(inv) { return (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0); }
function invoiceStatus(inv) {
  if (inv.voided) return 'voided';
  const paid = invoicePaid(inv);
  if (paid <= 0) return 'unpaid';
  if (paid < inv.amount) return 'partial';
  return 'paid';
}
