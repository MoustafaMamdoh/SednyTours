import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon, Shield, Database, Users,
  PlusCircle, Trash2, Edit2, CheckCircle, X, Eye, EyeOff,
  RefreshCw, Key, Download, Upload
} from 'lucide-react';
import { api, BASE } from '../api.js';

const LEVEL_LABEL = { 1: 'مدخل بيانات', 2: 'محاسب', 3: 'مدير عام' };
const LEVEL_COLOR = { 1: 'warning', 2: 'primary', 3: 'success' };

const USER_EMPTY = { username: '', full_name: '', password: '', level: 1 };

export default function Settings({ user }) {
  const isAdmin = user?.level === 3;

  // ── Users tab ────────────────────────────────────────────
  const [users, setUsers]         = useState([]);
  const [userForm, setUserForm]   = useState(USER_EMPTY);
  const [editUser, setEditUser]   = useState(null);   // user object being edited
  const [showPw, setShowPw]       = useState(false);
  const [userMsg, setUserMsg]     = useState(null);
  const [userLoading, setUserLoading] = useState(false);

  // ── Accounts tab ─────────────────────────────────────────
  const [accounts, setAccounts]   = useState([]);
  const [editAcc, setEditAcc]     = useState(null);
  const [accMsg, setAccMsg]       = useState(null);

  // ── Periods / DB ─────────────────────────────────────────
  const [periods, setPeriods]     = useState([]);

  // ── Active tab ────────────────────────────────────────────
  const [tab, setTab] = useState('users');
  const [restoreStatus, setRestoreStatus] = useState('');

  const loadAll = () => {
    api.getUsers().then(setUsers).catch(() => {});
    api.getAccounts().then(setAccounts).catch(() => {});
    api.getPeriods().then(setPeriods).catch(() => {});
  };
  useEffect(() => { loadAll(); }, []);

  // ──────────────────────────────────────────────────────────
  //  USER CRUD
  // ──────────────────────────────────────────────────────────
  const setU = (k, v) => setUserForm(f => ({ ...f, [k]: v }));

  async function saveUser() {
    if (!userForm.username || !userForm.full_name || (!editUser && !userForm.password)) {
      setUserMsg({ type: 'error', text: 'يرجى تعبئة جميع الحقول المطلوبة' }); return;
    }
    setUserLoading(true); setUserMsg(null);
    try {
      if (editUser) {
        const payload = {};
        if (userForm.full_name) payload.full_name = userForm.full_name;
        if (userForm.password)  payload.password  = userForm.password;
        payload.level     = userForm.level;
        payload.is_active = userForm.is_active !== false;
        await api.updateUser(editUser.id, payload, user.id);
        setUserMsg({ type: 'success', text: 'تم تحديث بيانات المستخدم بنجاح' });
      } else {
        await api.createUser(userForm, user.id);
        setUserMsg({ type: 'success', text: 'تم إنشاء المستخدم بنجاح' });
      }
      setUserForm(USER_EMPTY); setEditUser(null);
      api.getUsers().then(setUsers);
    } catch (e) {
      setUserMsg({ type: 'error', text: e.message });
    } finally { setUserLoading(false); }
  }

  async function deleteUser(uid) {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      await api.deleteUser(uid, user.id);
      api.getUsers().then(setUsers);
    } catch (e) { alert(e.message); }
  }

  function startEditUser(u) {
    setEditUser(u);
    setUserForm({ username: u.username, full_name: u.full_name, password: '', level: u.level, is_active: u.is_active });
  }

  async function toggleActive(u) {
    try {
      await api.updateUser(u.id, { is_active: !u.is_active }, user.id);
      api.getUsers().then(setUsers);
    } catch (e) { alert(e.message); }
  }

  // ──────────────────────────────────────────────────────────
  //  ACCOUNT EDIT
  // ──────────────────────────────────────────────────────────
  async function saveAccount() {
    if (!editAcc) return;
    try {
      await api.updateAccount(editAcc.id, { name: editAcc.name, balance: parseFloat(editAcc.balance) }, user.id);
      setAccMsg({ type: 'success', text: 'تم تحديث الحساب' });
      setEditAcc(null);
      api.getAccounts().then(setAccounts);
    } catch (e) { setAccMsg({ type: 'error', text: e.message }); }
  }

  const byType = (t) => accounts.filter(a => a.type === t && a.parent_id != null);

  // ──────────────────────────────────────────────────────────
  //  BACKUP / RESTORE
  // ──────────────────────────────────────────────────────────
  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm("تنبيه خطير: استعادة النسخة الاحتياطية ستمسح جميع البيانات الحالية. هل أنت متأكد؟")) {
      e.target.value = null;
      return;
    }
    try {
      setRestoreStatus("جاري الاستعادة...");
      const res = await api.restoreBackup(file, user.id);
      setRestoreStatus(res.message || "تمت الاستعادة بنجاح!");
      alert("تمت الاستعادة بنجاح. يجب إعادة تحميل الصفحة.");
      window.location.reload();
    } catch (err) {
      setRestoreStatus("خطأ: " + err.message);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch(`${BASE}/backup?caller_id=${user?.id}`);
      if (!res.ok) {
        throw new Error('حدث خطأ. هل قمت بإعادة تشغيل الباك إند لتفعيل التحديث؟');
      }
      const blob = await res.blob();
      if (blob.type.includes("text/html")) {
        throw new Error("السيرفر أرجع ملف HTML بدلاً من قاعدة البيانات. يرجى التأكد من إعادة تشغيل الباك إند (Terminal) لتفعيل الأكواد الجديدة.");
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sydney_tours_backup_${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  // ──────────────────────────────────────────────────────────
  //  RENDER
  // ──────────────────────────────────────────────────────────
  const TABS = [
    { id: 'users',    label: 'إدارة المستخدمين', icon: Users },
    { id: 'accounts', label: 'شجرة الحسابات',    icon: Database },
    { id: 'system',   label: 'معلومات النظام',    icon: SettingsIcon },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Tab bar */}
      <div className="glass-panel" style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              background: tab === id ? 'var(--primary-color)' : 'transparent',
              color:      tab === id ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ══════════ USERS TAB ══════════ */}
      {tab === 'users' && (
        <div style={{ flex: 1, display: 'flex', gap: '1.5rem', minHeight: 0 }}>

          {/* User list */}
          <div className="glass-panel" style={{ flex: 2, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: 'var(--secondary-color)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} color="var(--primary-color)" /> قائمة المستخدمين وصلاحياتهم
            </h3>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table className="custom-table">
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                  <tr>
                    <th>#</th>
                    <th>الاسم الكامل</th>
                    <th>اسم المستخدم</th>
                    <th>مستوى الصلاحية</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td style={{ fontWeight: 700 }}>{u.full_name}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--primary-color)' }}>{u.username}</td>
                      <td>
                        <span className={`badge ${LEVEL_COLOR[u.level] || 'warning'}`}>
                          {LEVEL_LABEL[u.level] || 'غير محدد'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.is_active ? 'success' : 'danger'}`}>
                          {u.is_active ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button title="تعديل" onClick={() => startEditUser(u)}
                              style={{ background: 'var(--primary-light)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'var(--primary-color)' }}>
                              <Edit2 size={14} />
                            </button>
                            <button title={u.is_active ? 'إيقاف' : 'تفعيل'} onClick={() => toggleActive(u)}
                              style={{ background: u.is_active ? 'var(--warning-light)' : 'var(--success-light)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', color: u.is_active ? 'var(--warning-color)' : 'var(--success-color)' }}>
                              {u.is_active ? <X size={14} /> : <CheckCircle size={14} />}
                            </button>
                            {u.id !== user.id && (
                              <button title="حذف" onClick={() => deleteUser(u.id)}
                                style={{ background: 'var(--danger-light)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'var(--danger-color)' }}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Form */}
          {isAdmin && (
            <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ color: 'var(--secondary-color)' }}>
                {editUser ? `تعديل: ${editUser.full_name}` : 'إضافة مستخدم جديد'}
              </h3>

              {userMsg && (
                <div style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.88rem',
                  background: userMsg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
                  color:      userMsg.type === 'success' ? 'var(--success-color)'  : 'var(--danger-color)' }}>
                  {userMsg.text}
                </div>
              )}

              <div className="form-group">
                <label>الاسم الكامل</label>
                <input className="custom-input" value={userForm.full_name} onChange={e => setU('full_name', e.target.value)} />
              </div>
              {!editUser && (
                <div className="form-group">
                  <label>اسم المستخدم (Login)</label>
                  <input className="custom-input" placeholder="بالإنجليزية بدون مسافة" value={userForm.username} onChange={e => setU('username', e.target.value)} />
                </div>
              )}
              <div className="form-group">
                <label>{editUser ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء)' : 'كلمة المرور'}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} className="custom-input" style={{ paddingLeft: '2.5rem' }}
                    value={userForm.password} onChange={e => setU('password', e.target.value)} />
                  <button onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>مستوى الصلاحية</label>
                <select className="custom-input" value={userForm.level} onChange={e => setU('level', +e.target.value)}>
                  <option value={1}>Level 1 — مدخل بيانات</option>
                  <option value={2}>Level 2 — محاسب</option>
                  <option value={3}>Level 3 — مدير عام (كل الصلاحيات)</option>
                </select>
              </div>
              {editUser && (
                <div className="form-group">
                  <label>حالة الحساب</label>
                  <select className="custom-input" value={userForm.is_active ? 'true' : 'false'} onChange={e => setU('is_active', e.target.value === 'true')}>
                    <option value="true">نشط ✓</option>
                    <option value="false">موقوف ✗</option>
                  </select>
                </div>
              )}

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={saveUser} disabled={userLoading}>
                  {editUser ? <><Key size={16} /> تحديث البيانات</> : <><PlusCircle size={16} /> إنشاء المستخدم</>}
                </button>
                {editUser && (
                  <button className="btn btn-outline" onClick={() => { setEditUser(null); setUserForm(USER_EMPTY); setUserMsg(null); }}>
                    <X size={16} /> إلغاء التعديل
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ ACCOUNTS TAB ══════════ */}
      {tab === 'accounts' && (
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} color="var(--primary-color)" /> شجرة الحسابات (Chart of Accounts)
            </h3>
            <button className="btn btn-outline" onClick={() => api.getAccounts().then(setAccounts)}>
              <RefreshCw size={16} /> تحديث
            </button>
          </div>

          {accMsg && (
            <div style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.88rem',
              background: accMsg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
              color:      accMsg.type === 'success' ? 'var(--success-color)'  : 'var(--danger-color)' }}>
              {accMsg.text}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            {[
              ['asset',     'الأصول',      'var(--primary-color)',  'var(--primary-light)'],
              ['liability', 'الخصوم',      'var(--danger-color)',   'var(--danger-light)'],
              ['revenue',   'الإيرادات',  'var(--success-color)',  'var(--success-light)'],
              ['expense',   'المصروفات',  '#d97706',               '#fef3c7'],
            ].map(([type, label, color, bg]) => (
              <div key={type} style={{ background: bg, borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                <div style={{ fontWeight: 700, color, marginBottom: '1rem', fontSize: '1rem' }}>{label}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${color}22` }}>
                      <th style={{ textAlign: 'right', padding: '0.3rem 0.5rem', color }}>الحساب</th>
                      <th style={{ textAlign: 'center', padding: '0.3rem', color }}>الرصيد (ج.م)</th>
                      {isAdmin && <th style={{ width: 40 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {byType(type).map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '0.35rem 0.5rem' }}>
                          {editAcc?.id === a.id
                            ? <input value={editAcc.name} onChange={e => setEditAcc({ ...editAcc, name: e.target.value })}
                                className="custom-input" style={{ padding: '0.2rem 0.4rem', fontSize: '0.85rem' }} />
                            : a.name}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {editAcc?.id === a.id
                            ? <input type="number" value={editAcc.balance} onChange={e => setEditAcc({ ...editAcc, balance: e.target.value })}
                                className="custom-input" style={{ padding: '0.2rem 0.4rem', fontSize: '0.85rem', textAlign: 'center', width: '100px' }} />
                            : Math.abs(a.balance).toLocaleString('ar-EG')}
                        </td>
                        {isAdmin && (
                          <td style={{ textAlign: 'center' }}>
                            {editAcc?.id === a.id
                              ? <button onClick={saveAccount} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success-color)' }}><CheckCircle size={16} /></button>
                              : <button onClick={() => setEditAcc({ ...a })} style={{ background: 'none', border: 'none', cursor: 'pointer', color }}><Edit2 size={14} /></button>
                            }
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ SYSTEM TAB ══════════ */}
      {tab === 'system' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignContent: 'start' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--secondary-color)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} color="var(--primary-color)" /> قاعدة البيانات
            </h3>
            {[
              ['نوع قاعدة البيانات', 'SQLite (Local)'],
              ['ملف البيانات', 'backend/sydney_tours.db'],
              ['حالة الاتصال', <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>متصل ✓</span>],
              ['عدد الحسابات', `${accounts.length} حساب`],
              ['الفترة الحالية', periods[0] ? `${periods[0].month}/${periods[0].year}` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
            
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={handleDownloadBackup}
                 className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                <Download size={16} /> تحميل نسخة احتياطية (Backup)
              </button>
              
              <div style={{ position: 'relative' }}>
                <input type="file" accept=".db" onChange={handleRestore}
                       style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                <button className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload size={16} /> استرجاع نسخة احتياطية (Restore)
                </button>
              </div>
              {restoreStatus && (
                <div style={{ textAlign: 'center', fontSize: '0.85rem', color: restoreStatus.includes('خطأ') ? 'var(--danger-color)' : 'var(--success-color)', fontWeight: 600 }}>
                  {restoreStatus}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--secondary-color)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SettingsIcon size={18} color="var(--primary-color)" /> بيانات النظام
            </h3>
            {[
              ['اسم الشركة', 'سيدني تورز'],
              ['إصدار النظام', 'v2.0.0 (Production)'],
              ['المستخدم الحالي', user?.full_name],
              ['مستوى الصلاحية', LEVEL_LABEL[user?.level] || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
