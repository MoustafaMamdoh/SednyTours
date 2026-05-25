import React, { useEffect, useState, useRef } from 'react';
import {
  Plane, LayoutDashboard, Receipt as ReceiptIcon, FileSpreadsheet,
  FileText, Users, Settings as SettingsIcon, Banknote, TrendingUp,
  Search, LogOut, User, ChevronDown, AlertCircle, Menu, X as XIcon
} from 'lucide-react';
import { api, BASE } from './api.js';
import Login    from './components/Login.jsx';
import Receipts  from './components/Receipts.jsx';
import Journal   from './components/Journal.jsx';
import Tickets   from './components/Tickets.jsx';
import HajjUmrah from './components/HajjUmrah.jsx';
import Employees from './components/Employees.jsx';
import Settings  from './components/Settings.jsx';

const NAV = [
  { id: 'dashboard', label: 'لوحة التحكم',        icon: LayoutDashboard },
  { id: 'receipts',  label: 'سندات القبض والصرف', icon: ReceiptIcon },
  { id: 'journal',   label: 'يومية الحسابات',      icon: FileSpreadsheet },
  { id: 'tickets',   label: 'تذاكر الطيران',       icon: Plane },
  { id: 'hajj',      label: 'الحج والعمرة',        icon: FileText },
  { id: 'employees', label: 'شؤون الموظفين',       icon: Users },
  { id: 'settings',  label: 'الإعدادات والأمان',   icon: SettingsIcon },
];

const PAGE_TITLES = {
  dashboard: 'نظرة عامة على النظام',
  receipts:  'إدارة السندات المالية',
  journal:   'القيود ويومية الحسابات',
  tickets:   'سجل تذاكر الطيران',
  hajj:      'رحلات الحج والعمرة',
  employees: 'شؤون الموظفين والرواتب',
  settings:  'الإعدادات والصلاحيات',
};

// ─── DASHBOARD ───────────────────────────────────────────────
function Dashboard({ user }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.dashboard().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state" />;
  if (error)   return <div className="error-state"><AlertCircle size={32} /> {error}</div>;

  const stats = [
    { label: 'رصيد الخزينة الرئيسية', value: `${(data.treasury_balance || 0).toLocaleString('ar-EG')} ج.م`, cls: 'primary', Icon: Banknote },
    { label: 'تذاكر مباعة',            value: `${data.tickets_sold} تذكرة`,                                      cls: 'success', Icon: Plane },
    { label: 'سندات قيد الانتظار',     value: `${data.pending_receipts} سند`,                                    cls: 'warning', Icon: ReceiptIcon },
    { label: 'أرباح الطيران',          value: `${(data.ticket_profit || 0).toLocaleString('ar-EG')} ج.م`,        cls: 'danger',  Icon: TrendingUp },
  ];

  return (
    <>
      <div className="stats-grid">
        {stats.map(({ label, value, cls, Icon }) => (
          <div key={label} className={`stat-card glass-card ${cls}`}>
            <div className="stat-header">
              <span className="stat-title">{label}</span>
              <div className="stat-icon"><Icon size={20} /></div>
            </div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>
      <div className="glass-panel table-container" style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: 'var(--secondary-color)' }}>أحدث الحركات المالية</h3>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', gap: '0.5rem' }}>
            <Search size={16} color="var(--text-muted)" />
            <input type="text" placeholder="بحث..." style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit' }} />
          </div>
        </div>
        <table className="custom-table">
          <thead><tr><th>رقم المستند</th><th>البيان</th><th>مدين</th><th>دائن</th><th>التاريخ</th></tr></thead>
          <tbody>
            {(data.recent_journal || []).map(e => (
              <tr key={e.id}>
                <td>
                  <span style={{
                    background: e.doc_type === 'REC' ? 'var(--success-light)' : e.doc_type === 'PAY' ? 'var(--danger-light)' : 'var(--primary-light)',
                    color:      e.doc_type === 'REC' ? 'var(--success-color)' : e.doc_type === 'PAY' ? 'var(--danger-color)' : 'var(--primary-color)',
                    padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold'
                  }}>{e.doc_no}</span>
                </td>
                <td>{e.description}</td>
                <td style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>{e.debit > 0 ? e.debit.toLocaleString('ar-EG') : '-'}</td>
                <td style={{ color: 'var(--danger-color)',  fontWeight: 'bold' }}>{e.credit > 0 ? e.credit.toLocaleString('ar-EG') : '-'}</td>
                <td>{e.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── PROFILE MENU ────────────────────────────────────────────
function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const LEVEL_LABEL = { 1: 'مدخل بيانات', 2: 'محاسب', 3: 'مدير عام' };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="user-profile glass-card" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: '1.2' }}>
          <span style={{ fontWeight: '700', color: 'var(--secondary-color)' }}>{user.full_name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{LEVEL_LABEL[user.level] || 'مستخدم'}</span>
        </div>
        <div className="user-avatar">{user.full_name?.charAt(0)}</div>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </div>

      {open && (
        <div className="glass-panel" style={{
          position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0,
          minWidth: '200px', padding: '0.5rem', zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: '0.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.full_name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>@{user.username}</div>
          </div>
          <button onClick={onLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem',
              background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px',
              color: 'var(--danger-color)', fontWeight: 600, fontFamily: 'inherit', fontSize: '0.9rem',
              transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-light)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <LogOut size={16} /> تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
}

// ─── API STATUS ──────────────────────────────────────────────
function APIStatusBadge() {
  const [online, setOnline] = useState(null);
  useEffect(() => {
    fetch(`${BASE}/periods`)
      .then((res) => setOnline(res.ok))
      .catch(() => setOnline(false));
  }, []);
  if (online === null) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem',
      color: online ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: '600' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
        background: online ? 'var(--success-color)' : 'var(--danger-color)' }} />
      {online ? 'الخادم متصل (Live DB)' : 'الخادم غير متصل'}
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]   = useState('dashboard');
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sydney_user');
    if (saved) { try { setUser(JSON.parse(saved)); } catch(e){} }
  }, []);

  const handleLogin = (u) => { setUser(u); localStorage.setItem('sydney_user', JSON.stringify(u)); };
  const handleLogout = () => { setUser(null); localStorage.removeItem('sydney_user'); };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-container">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${isSidebarOpen ? 'open' : ''}`}>
        <div className="brand-logo" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="logo-icon"><Plane size={24} /></div>
            سيدني تورز
          </div>
          {isSidebarOpen && (
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(false)} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
              <XIcon size={24} />
            </button>
          )}
        </div>
        <nav className="nav-menu" style={{ marginTop: '2rem' }}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <a key={id} href="#" className={`nav-item ${tab === id ? 'active' : ''}`}
              onClick={e => { e.preventDefault(); setTab(id); setIsSidebarOpen(false); }}>
              <Icon /><span>{label}</span>
            </a>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '1rem 0.5rem' }}>
          <APIStatusBadge />
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="page-title">{PAGE_TITLES[tab]}</h1>
          </div>
          <ProfileMenu user={user} onLogout={handleLogout} />
        </header>

        {tab === 'dashboard' && <Dashboard user={user} />}
        {tab === 'receipts'  && <Receipts  user={user} />}
        {tab === 'journal'   && <Journal   user={user} />}
        {tab === 'tickets'   && <Tickets   user={user} />}
        {tab === 'hajj'      && <HajjUmrah user={user} />}
        {tab === 'employees' && <Employees user={user} />}
        {tab === 'settings'  && <Settings  user={user} />}
      </main>
    </div>
  );
}
