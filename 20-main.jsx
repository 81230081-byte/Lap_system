// نقطة الدخول: بوابة تسجيل الدخول وربط React بالصفحة

// ---------------------------------------------------------------------------
// Root: auth gate
// ---------------------------------------------------------------------------
function Root() {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = sb.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="h-screen w-full flex items-center justify-center" style={{ background: C.bg }}><div className="text-sm" style={{ color: C.inkMuted }}>...جارِ التحقق من الدخول</div></div>;
  if (!session) return <LoginScreen />;
  return <AppShell key={session.user.id} session={session} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
