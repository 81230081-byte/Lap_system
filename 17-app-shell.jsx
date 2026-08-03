// حاوية التطبيق الرئيسية: جلب البيانات، الاشتراك اللحظي، التوجيه بين الشاشات، وكل عمليات الحفظ

const VIEW_TITLES = {
  dashboard: 'لوحة التحكم', appointments: 'المواعيد', patients: 'المرضى', orders: 'الطلبات والعينات',
  results: 'إدخال النتائج', report: 'تقرير النتائج', history: 'السجل التاريخي للمريض', inventory: 'المخزون',
  qc: 'ضبط الجودة', suppliers: 'الموردين والمشتريات', treasury: 'الصناديق والبنوك',
  'financial-reports': 'التقارير المالية', billing: 'الفواتير', audit: 'سجل التدقيق', settings: 'الإعدادات',
};

// ---------------------------------------------------------------------------
// App shell (data + realtime + routing)
// ---------------------------------------------------------------------------
function AppShell({ session }) {
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('');
  const [myActive, setMyActive] = useState(true);
  const [staff, setStaff] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [labSettings, setLabSettings] = useState(null);
  const [view, setView] = useState('dashboard');
  const [prevView, setPrevView] = useState(null);
  const [patients, setPatients] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [referringDoctors, setReferringDoctors] = useState([]);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [commissionPayments, setCommissionPayments] = useState([]);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [journalLines, setJournalLines] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [qc, setQc] = useState([]);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [patientFilter, setPatientFilter] = useState(null);
  const [historyPatientId, setHistoryPatientId] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const clearPendingAction = () => setPendingAction(null);

  const isManager = role === 'مدير';
  const myPermissionSet = new Set(permissions.filter((p) => p.user_id === session.user.id).map((p) => p.permission));
  const can = (perm) => isManager || myPermissionSet.has(perm);
  const askConfirm = (opts) => setConfirmState({ open: true, ...opts });
  const closeConfirm = () => setConfirmState(null);

  const [toast, setToast] = useState(null);
  const notify = (type, message) => setToast({ type, message, key: Date.now() });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchAll = async () => {
    try {
      const [pRes, cRes, oRes, invRes, invenRes, aRes, profRes, permRes, supRes, purRes, accRes, txRes, lsRes, rdRes, spRes, cpRes, coaRes, jlRes, apptRes, qcRes] = await Promise.all([
        sb.from('patients').select('*').order('created_at', { ascending: false }),
        sb.from('catalog_tests').select('*').order('created_at'),
        sb.from('orders').select('*').order('created_at', { ascending: false }),
        sb.from('invoices').select('*, payments(*)').order('created_at', { ascending: false }),
        sb.from('inventory').select('*').order('name'),
        sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(300),
        sb.from('profiles').select('*').order('created_at'),
        sb.from('user_permissions').select('*'),
        sb.from('suppliers').select('*').order('name'),
        sb.from('purchases').select('*, purchase_payments(*)').order('created_at', { ascending: false }),
        sb.from('accounts').select('*').order('created_at'),
        sb.from('transactions').select('*').order('created_at', { ascending: false }).limit(500),
        sb.from('lab_settings').select('*').eq('id', true).maybeSingle(),
        sb.from('referring_doctors').select('*').order('name'),
        sb.from('salary_payments').select('*').order('created_at', { ascending: false }),
        sb.from('doctor_commission_payments').select('*').order('created_at', { ascending: false }),
        sb.from('chart_of_accounts').select('*').order('code'),
        sb.from('journal_lines').select('*, journal_entries(entry_date, description, source, reference_id)').order('created_at', { ascending: false }).limit(2000),
        sb.from('appointments').select('*').order('scheduled_at', { ascending: true }).limit(500),
        sb.from('quality_control').select('*').order('created_at', { ascending: false }).limit(500),
      ]);
      if (pRes.data) setPatients(pRes.data);
      if (cRes.data) setCatalog(cRes.data);
      if (oRes.data) setOrders(oRes.data);
      if (invRes.data) setInvoices(invRes.data);
      if (invenRes.data) setInventory(invenRes.data);
      if (aRes.data) setAuditLog(aRes.data);
      if (profRes.data) {
        setStaff(profRes.data);
        const me = profRes.data.find((p) => p.id === session.user.id);
        if (me) { setDisplayName(me.display_name); setRole(me.role); setMyActive(me.active !== false); }
      }
      if (permRes.data) setPermissions(permRes.data);
      if (supRes.data) setSuppliers(supRes.data);
      if (purRes.data) setPurchases(purRes.data);
      if (accRes.data) setAccounts(accRes.data);
      if (txRes.data) setTransactions(txRes.data);
      if (lsRes.data) setLabSettings(lsRes.data);
      if (rdRes.data) setReferringDoctors(rdRes.data);
      if (spRes.data) setSalaryPayments(spRes.data);
      if (cpRes.data) setCommissionPayments(cpRes.data);
      if (coaRes.data) setChartOfAccounts(coaRes.data);
      if (jlRes.data) setJournalLines(jlRes.data);
      if (apptRes.data) setAppointments(apptRes.data);
      if (qcRes.data) setQc(qcRes.data);
      setSaveError(false);
    } catch (e) {
      setSaveError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const channel = sb.channel('lab-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => fetchAll())
      .subscribe();
    return () => sb.removeChannel(channel);
  }, []);

  const actions = {
    addPatient: async (p) => {
      const { error } = await sb.from('patients').insert(p);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'إضافة مريض', p_details: `تسجيل: ${p.name}` });
      fetchAll();
    },
    updatePatient: async (id, p) => {
      const { error } = await sb.from('patients').update(p).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تعديل مريض', p_details: `تعديل: ${p.name}` });
      fetchAll();
    },
    deletePatient: async (id, name) => {
      const { error } = await sb.from('patients').delete().eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'حذف مريض', p_details: `حذف: ${name}` });
      fetchAll();
    },

    addOrder: async (patientId, testIds, referringDoctor, paymentType, accountId) => {
      const patient = patients.find((p) => p.id === patientId);
      const { error } = await sb.rpc('create_order', { p_patient_id: patientId, p_test_ids: testIds, p_user_name: displayName, p_patient_name: patient?.name || '', p_referring_doctor: referringDoctor || null, p_payment_type: paymentType || 'credit', p_account_id: accountId || null });
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },
    cancelOrder: async (orderId, sampleId) => {
      const { error } = await sb.rpc('cancel_order', { p_order_id: orderId, p_user_name: displayName, p_sample_id: sampleId });
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },
    submitResults: async (orderId, results, hasCritical, sampleId) => {
      const { error } = await sb.rpc('submit_results', { p_order_id: orderId, p_results: results, p_has_critical: hasCritical, p_user_name: displayName, p_sample_id: sampleId });
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },
    verifyResults: async (orderId, sampleId) => {
      const { error } = await sb.rpc('verify_results', { p_order_id: orderId, p_user_name: displayName, p_sample_id: sampleId });
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },
    rejectResults: async (orderId, sampleId, reason) => {
      const { error } = await sb.rpc('reject_results', { p_order_id: orderId, p_user_name: displayName, p_sample_id: sampleId, p_reason: reason || null });
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },

    addPayment: async (invoiceId, amount, method, accountId) => {
      const { error } = await sb.rpc('add_payment', { p_invoice_id: invoiceId, p_amount: amount, p_method: method, p_user_name: displayName, p_account_id: accountId || null });
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },

    addInventory: async (item) => {
      const { error } = await sb.from('inventory').insert(item);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'إضافة صنف مخزون', p_details: item.name });
      fetchAll();
    },
    updateInventory: async (id, item) => {
      const { error } = await sb.from('inventory').update(item).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تعديل صنف مخزون', p_details: item.name });
      fetchAll();
    },
    deleteInventory: async (id, name) => {
      const { error } = await sb.from('inventory').delete().eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'حذف صنف مخزون', p_details: name });
      fetchAll();
    },
    setQuantity: async (id, name, qty) => {
      const { error } = await sb.from('inventory').update({ quantity: qty }).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تعديل يدوي للمخزون', p_details: `${name} → ${qty}` });
      fetchAll();
    },

    addTest: async (t) => {
      const { error } = await sb.from('catalog_tests').insert(t);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'إضافة فحص', p_details: t.name });
      fetchAll();
    },
    updateTest: async (id, t) => {
      const { error } = await sb.from('catalog_tests').update(t).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تعديل فحص', p_details: t.name });
      fetchAll();
    },
    deleteTest: async (id, name) => {
      const { error } = await sb.from('catalog_tests').delete().eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'حذف فحص', p_details: name });
      fetchAll();
    },

    addSupplier: async (s) => {
      const { error } = await sb.from('suppliers').insert(s);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'إضافة مورد', p_details: s.name });
      fetchAll();
    },
    updateSupplier: async (id, s) => {
      const { error } = await sb.from('suppliers').update(s).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تعديل مورد', p_details: s.name });
      fetchAll();
    },
    deleteSupplier: async (id, name) => {
      const { error } = await sb.from('suppliers').delete().eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'حذف مورد', p_details: name });
      fetchAll();
    },
    addPurchase: async (supplierId, items, paymentType, invoiceNo, accountId) => {
      const supplier = suppliers.find((s) => s.id === supplierId);
      const { error } = await sb.rpc('create_purchase', { p_supplier_id: supplierId, p_items: items, p_payment_type: paymentType, p_invoice_no: invoiceNo || null, p_user_name: displayName, p_supplier_name: supplier?.name || '', p_account_id: accountId || null });
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },
    addPurchasePayment: async (purchaseId, amount, method, accountId) => {
      const { error } = await sb.rpc('add_purchase_payment', { p_purchase_id: purchaseId, p_amount: amount, p_method: method, p_user_name: displayName, p_account_id: accountId || null });
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },

    addAccount: async (a) => {
      const { error } = await sb.from('accounts').insert(a);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'إضافة حساب', p_details: a.name });
      fetchAll();
    },
    updateAccount: async (id, a) => {
      const { error } = await sb.from('accounts').update(a).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تعديل حساب', p_details: a.name });
      fetchAll();
    },
    deleteAccount: async (id, name) => {
      const { error } = await sb.from('accounts').delete().eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'حذف حساب', p_details: name });
      fetchAll();
    },

    addCoaAccount: async (a) => {
      const { error } = await sb.from('chart_of_accounts').insert(a);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'إضافة حساب بالشجرة المحاسبية', p_details: `${a.code} - ${a.name_ar}` });
      fetchAll();
    },
    updateCoaAccount: async (id, a) => {
      const { error } = await sb.from('chart_of_accounts').update(a).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تعديل حساب بالشجرة المحاسبية', p_details: a.name_ar || '' });
      fetchAll();
    },
    deleteCoaAccount: async (id, name) => {
      const { error } = await sb.from('chart_of_accounts').delete().eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'حذف حساب من الشجرة المحاسبية', p_details: name });
      fetchAll();
    },
    addManualTransaction: async (accountId, direction, amount, category, description, coaId) => {
      const { error } = await sb.rpc('add_manual_transaction', { p_account_id: accountId, p_direction: direction, p_amount: amount, p_category: category, p_description: description || null, p_user_name: displayName, p_coa_id: coaId || null });
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },

    updateStaffRole: async (id, name, newRole) => {
      const { error } = await sb.from('profiles').update({ role: newRole }).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تغيير صلاحية موظف', p_details: `${name} → ${newRole}` });
      fetchAll();
    },
    updateStaffActive: async (id, name, isActive) => {
      const { error } = await sb.from('profiles').update({ active: isActive }).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: isActive ? 'تفعيل حساب موظف' : 'تعطيل حساب موظف', p_details: name });
      fetchAll();
    },
    updateStaffName: async (id, name) => {
      const { error } = await sb.from('profiles').update({ display_name: name }).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },

    createUser: async (email, password, displayName, initialRole) => {
      const { data, error } = await sb.functions.invoke('manage-users', { body: { action: 'create_user', email, password, display_name: displayName, role: initialRole } });
      if (error || data?.error) { notify('error', data?.error || friendlyError(error)); throw (error || new Error(data?.error)); }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'إنشاء مستخدم جديد', p_details: `${displayName} — ${email}` });
      notify('success', 'تم إنشاء الحساب بنجاح');
      fetchAll();
    },
    deleteUser: async (id, name) => {
      const { data, error } = await sb.functions.invoke('manage-users', { body: { action: 'delete_user', id } });
      if (error || data?.error) { notify('error', data?.error || friendlyError(error)); throw (error || new Error(data?.error)); }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'حذف مستخدم', p_details: name || '' });
      fetchAll();
    },
    resetUserPassword: async (id, newPassword) => {
      const { data, error } = await sb.functions.invoke('manage-users', { body: { action: 'reset_password', id, new_password: newPassword } });
      if (error || data?.error) { notify('error', data?.error || friendlyError(error)); throw (error || new Error(data?.error)); }
      notify('success', 'تم تحديث كلمة المرور');
    },
    grantPermission: async (userId, userName, permission, label) => {
      const { error } = await sb.from('user_permissions').insert({ user_id: userId, permission, granted_by: session.user.id });
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'منح صلاحية', p_details: `${userName} ← ${label || permission}` });
      fetchAll();
    },
    revokePermission: async (userId, userName, permission, label) => {
      const { error } = await sb.from('user_permissions').delete().eq('user_id', userId).eq('permission', permission);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'سحب صلاحية', p_details: `${userName} ← ${label || permission}` });
      fetchAll();
    },
    updateLabSettings: async (patch) => {
      const { error } = await sb.from('lab_settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', true);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تعديل بيانات المختبر', p_details: '' });
      fetchAll();
    },

    updateStaffSalary: async (id, name, baseSalary) => {
      const { error } = await sb.from('profiles').update({ base_salary: baseSalary }).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تعديل الراتب الأساسي', p_details: name });
      fetchAll();
    },
    paySalary: async (profileId, staffName, amount, accountId, period) => {
      const { error } = await sb.rpc('pay_salary', { p_profile_id: profileId, p_staff_name: staffName, p_amount: amount, p_account_id: accountId, p_period: period || null, p_user_name: displayName });
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },

    addReferringDoctor: async (doc) => {
      const { error } = await sb.from('referring_doctors').insert(doc);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'إضافة طبيب محوّل', p_details: doc.name });
      fetchAll();
    },
    updateReferringDoctor: async (id, doc) => {
      const { error } = await sb.from('referring_doctors').update(doc).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تعديل بيانات طبيب', p_details: doc.name });
      fetchAll();
    },
    deleteReferringDoctor: async (id, name) => {
      const { error } = await sb.from('referring_doctors').delete().eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'حذف طبيب محوّل', p_details: name });
      fetchAll();
    },
    payDoctorCommission: async (doctorName, amount, accountId, notes) => {
      const { error } = await sb.rpc('pay_doctor_commission', { p_doctor_name: doctorName, p_amount: amount, p_account_id: accountId, p_user_name: displayName, p_notes: notes || null });
      if (error) { notify('error', friendlyError(error)); throw error; }
      fetchAll();
    },

    addAppointment: async (appt) => {
      const { error } = await sb.from('appointments').insert({ ...appt, created_by: session.user.id });
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'إضافة موعد', p_details: `${appt.patient_name} — ${fmtDateTime(appt.scheduled_at)}` });
      fetchAll();
    },
    updateAppointment: async (id, patch, label) => {
      const { error } = await sb.from('appointments').update(patch).eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تعديل موعد', p_details: label || '' });
      fetchAll();
    },
    deleteAppointment: async (id, label) => {
      const { error } = await sb.from('appointments').delete().eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'حذف موعد', p_details: label || '' });
      fetchAll();
    },

    addQualityCheck: async (check) => {
      const { error } = await sb.from('quality_control').insert(check);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'تسجيل فحص جودة', p_details: `${check.item_name} — ${check.passed ? 'ناجح' : 'فاشل'}` });
      fetchAll();
    },
    deleteQualityCheck: async (id, label) => {
      const { error } = await sb.from('quality_control').delete().eq('id', id);
      if (error) { notify('error', friendlyError(error)); throw error; }
      await sb.rpc('log_action', { p_user_name: displayName, p_action: 'حذف فحص جودة', p_details: label || '' });
      fetchAll();
    },
  };

  const exportBackup = () => {
    const payload = { exportedAt: new Date().toISOString(), patients, catalog, orders, invoices, inventory, auditLog, suppliers, purchases, accounts, transactions, appointments, qc };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `نسخة-احتياطية-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeOrder = orders.find((o) => o.id === activeOrderId) || null;
  const activePatient = activeOrder ? patients.find((p) => p.id === activeOrder.patient_id) : null;
  const goTo = (v) => { setPrevView(view); setView(v); };
  const QUICK_ACTION_VIEW = { 'new-order': 'orders', 'new-patient': 'patients', 'new-appointment': 'appointments', 'new-payment': 'billing', 'new-qc': 'qc', 'new-inventory': 'inventory' };
  const onQuickAction = (key) => { setPendingAction(key); goTo(QUICK_ACTION_VIEW[key] || 'dashboard'); };
  const goToPatientOrders = (patientId) => { setPrevView(view); setPatientFilter(patientId); setView('orders'); };
  const navigate = (v) => { setPrevView(view); setPatientFilter(null); setView(v); };

  if (loading) return <div className="h-screen w-full flex items-center justify-center" style={{ background: C.bg }}><div className="text-sm" style={{ color: C.inkMuted }}>...جارِ تحميل البيانات</div></div>;

  if (!myActive) {
    return (
      <div dir="rtl" lang="ar" className="h-screen w-full flex items-center justify-center p-4" style={{ background: C.bg }}>
        <div className="w-full max-w-sm rounded-lg p-6 text-center" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="text-lg font-bold mb-2" style={{ color: C.critical }}>الحساب معطّل</div>
          <div className="text-sm mb-5" style={{ color: C.inkMuted }}>تم تعطيل هذا الحساب من قِبل الإدارة. تواصل مع مدير المختبر إذا كان هذا غير متوقع.</div>
          <button onClick={() => sb.auth.signOut()} className="w-full px-4 py-2.5 rounded-lg text-sm font-bold" style={{ background: C.accent, color: '#fff' }}>تسجيل الخروج</button>
        </div>
      </div>
    );
  }

  const historyPatient = patients.find((p) => p.id === historyPatientId) || null;
  const goToPatientHistory = (patientId) => { setPrevView(view); setHistoryPatientId(patientId); setView('history'); };
  const navigateMobile = (v) => { navigate(v); setMobileNavOpen(false); };

  return (
    <div dir="rtl" lang="ar" className="flex h-screen w-full overflow-hidden" style={{ background: C.bg }}>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(28,38,34,0.5)' }} onClick={() => setMobileNavOpen(false)} />
      )}
      <div className={`no-print h-full ${mobileNavOpen ? 'fixed inset-y-0 right-0 z-50' : 'hidden'} md:static md:block md:z-auto`}>
        <Sidebar view={view} setView={navigateMobile} displayName={displayName} role={role} isManager={isManager} can={can} labName={labSettings?.name} logoSrc={labSettings?.logo_b64 || LOGO_B64} onLogout={() => sb.auth.signOut()} onExport={exportBackup} saveError={saveError} />
      </div>
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        <div className="no-print md:hidden flex items-center justify-between px-4 py-3" style={{ background: C.surface, borderBottom: `1px solid ${C.line}` }}>
          <button onClick={() => setMobileNavOpen(true)} className="text-2xl leading-none px-1" style={{ color: C.ink }}>☰</button>
          <div className="font-bold text-sm" style={{ color: C.ink }}>{labSettings?.name || 'مختبر الشموخ'}</div>
          <div style={{ width: 24 }} />
        </div>
        {view !== 'dashboard' && (
          <div className="no-print flex items-center gap-3 px-6 py-2.5" style={{ background: C.surface, borderBottom: `1px solid ${C.line}` }}>
            <button onClick={() => goTo(prevView || 'dashboard')} className="text-sm font-bold flex items-center gap-1" style={{ color: C.accent }}>‹ رجوع</button>
            <span style={{ color: C.line }}>|</span>
            <span className="text-sm font-bold" style={{ color: C.inkMuted }}>{VIEW_TITLES[view] || ''}</span>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          {view === 'dashboard' && <Dashboard data={{ patients, catalog, orders, invoices, inventory, auditLog }} setView={goTo} setActiveOrderId={setActiveOrderId} onQuickAction={onQuickAction} isManager={isManager} can={can} />}
          {view === 'appointments' && <AppointmentsView appointments={appointments} patients={patients} actions={actions} askConfirm={askConfirm} isManager={isManager} can={can} onCreateOrder={goToPatientOrders} pendingAction={pendingAction} clearPendingAction={clearPendingAction} />}
          {view === 'qc' && <QCView qc={qc} displayName={displayName} actions={actions} isManager={isManager} can={can} askConfirm={askConfirm} pendingAction={pendingAction} clearPendingAction={clearPendingAction} />}
          {view === 'patients' && <PatientsView patients={patients} orders={orders} actions={actions} askConfirm={askConfirm} onViewOrders={goToPatientOrders} onViewHistory={goToPatientHistory} isManager={isManager} can={can} pendingAction={pendingAction} clearPendingAction={clearPendingAction} />}
          {view === 'orders' && <OrdersView patients={patients} catalog={catalog} orders={orders} inventory={inventory} accounts={accounts} actions={actions} setView={goTo} setActiveOrderId={setActiveOrderId} filterPatientId={patientFilter} clearFilter={() => setPatientFilter(null)} askConfirm={askConfirm} isManager={isManager} can={can} pendingAction={pendingAction} clearPendingAction={clearPendingAction} />}
          {view === 'results' && <ResultsEntryView order={activeOrder} patient={activePatient} catalog={catalog} actions={actions} setView={goTo} />}
          {view === 'report' && <ReportView order={activeOrder} patient={activePatient} catalog={catalog} setView={goTo} labSettings={labSettings} />}
          {view === 'history' && <PatientHistoryView patient={historyPatient} orders={orders} catalog={catalog} setView={goTo} setActiveOrderId={setActiveOrderId} labSettings={labSettings} />}
          {view === 'inventory' && <InventoryView inventory={inventory} catalog={catalog} actions={actions} askConfirm={askConfirm} isManager={isManager} can={can} pendingAction={pendingAction} clearPendingAction={clearPendingAction} />}
          {view === 'suppliers' && <SuppliersView suppliers={suppliers} purchases={purchases} inventory={inventory} accounts={accounts} actions={actions} askConfirm={askConfirm} isManager={isManager} can={can} />}
          {view === 'treasury' && (isManager || can('view_treasury')) && <TreasuryView accounts={accounts} transactions={transactions} staff={staff} salaryPayments={salaryPayments} chartOfAccounts={chartOfAccounts} actions={actions} askConfirm={askConfirm} isManager={isManager} can={can} />}
          {view === 'financial-reports' && (isManager || can('view_financial_reports')) && <FinancialReportsView accounts={accounts} transactions={transactions} invoices={invoices} purchases={purchases} orders={orders} referringDoctors={referringDoctors} commissionPayments={commissionPayments} patients={patients} suppliers={suppliers} chartOfAccounts={chartOfAccounts} journalLines={journalLines} actions={actions} />}
          {view === 'billing' && <BillingView invoices={invoices} orders={orders} patients={patients} accounts={accounts} actions={actions} />}
          {view === 'audit' && <AuditLogView auditLog={auditLog} />}
          {view === 'settings' && <SettingsView catalog={catalog} inventory={inventory} orders={orders} actions={actions} askConfirm={askConfirm} isManager={isManager} can={can} staff={staff} permissions={permissions} myId={session.user.id} labSettings={labSettings} />}
        </main>
      </div>
      <ConfirmDialog state={confirmState} onCancel={closeConfirm} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
