// شاشة تسجيل الدخول

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const submit = async () => {
    setError(''); setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError('بيانات الدخول غير صحيحة، أو الحساب غير موجود بعد');
  };

  const forgot = async () => {
    if (!email.trim()) { setError('أدخل بريدك الإلكتروني أولاً'); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email.trim());
    setResetMsg(error ? 'تعذر الإرسال — تأكد من البريد' : 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك');
  };

  return (
    <div dir="rtl" lang="ar" className="h-screen w-full flex items-center justify-center p-4" style={{ background: C.bg }}>
      <div className="w-full max-w-sm rounded-lg p-6" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex justify-center mb-3"><img src={LOGO_B64} alt="شعار المختبر" style={{ height: 64, width: "auto" }} /></div>
        <div className="text-xl font-bold mb-1 text-center" style={{ color: C.ink }}>مختبر الشموخ</div>
        <div className="text-sm mb-5" style={{ color: C.inkMuted }}>تسجيل الدخول لنظام إدارة المختبر</div>
        <div className="space-y-3">
          <Field label="البريد الإلكتروني">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} />
          </Field>
          <Field label="كلمة المرور">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle} />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          {resetMsg && <div className="text-xs" style={{ color: C.inkMuted }}>{resetMsg}</div>}
          <button onClick={submit} disabled={busy} className="w-full px-4 py-2.5 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff', opacity: busy ? 0.6 : 1 }}>{busy ? '...جارِ الدخول' : 'دخول'}</button>
          <button onClick={forgot} className="w-full text-xs font-bold" style={{ color: C.accent }}>نسيت كلمة المرور؟</button>
        </div>
        <div className="text-xs mt-5 pt-4" style={{ color: C.inkFaint, borderTop: `1px solid ${C.line}` }}>
          الحسابات تُنشأ من قِبل مسؤول المختبر عبر لوحة Supabase. تواصل معه إن لم يكن لديك حساب بعد.
        </div>
      </div>
    </div>
  );
}
