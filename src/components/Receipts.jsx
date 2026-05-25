import React, { useEffect, useState, useRef } from 'react';
import { PlusCircle, CheckCircle, Wallet, Landmark, CreditCard, FileText, X, Trash2, Edit2, User } from 'lucide-react';
import { api } from '../api.js';

const TYPES   = ['قبض', 'صرف'];
const METHODS = [
  { id: 'cash',     label: 'نقدي',       icon: Wallet },
  { id: 'check',    label: 'شيك',        icon: FileText },
  { id: 'instapay', label: 'انستا باي',  icon: CreditCard },
  { id: 'bank',     label: 'تحويل بنكي', icon: Landmark },
  { id: 'wallet',   label: 'محفظة كاش',  icon: Wallet },
];

const EMPTY = {
  type: 'قبض', account_id: '', account_name_manual: '', amount: '',
  description: '', payment_method: 'cash', payee: '',
  check_no: '', bank_name: '', wallet_no: '', wallet_provider: 'فودافون كاش',
  seller_id: '', seller_commission: '',
};

/* ── Combobox: dropdown + free-text ─────────────────────── */
function AccountCombobox({ accounts, value_id, value_manual, onChange }) {
  const [query, setQuery]   = useState(value_manual || '');
  const [open, setOpen]     = useState(false);
  const ref                 = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = query.length > 0
    ? accounts.filter(a => a.name.includes(query) && a.parent_id != null)
    : accounts.filter(a => a.parent_id != null);

  function pick(acc) {
    setQuery(acc.name); setOpen(false);
    onChange({ account_id: acc.id, account_name_manual: acc.name });
  }

  function handleInput(v) {
    setQuery(v); setOpen(true);
    onChange({ account_id: null, account_name_manual: v });
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="custom-input"
        placeholder="اكتب اسم الحساب أو اختر من القائمة..."
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0,
          background: 'white', border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 999, maxHeight: '200px', overflowY: 'auto'
        }}>
          {filtered.map(a => (
            <div key={a.id} onClick={() => pick(a)}
              style={{ padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.9rem',
                borderBottom: '1px solid rgba(0,0,0,0.04)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              {a.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Receipts({ user }) {
  const isAdmin = user?.level === 3;
  const [receipts,  setReceipts]  = useState([]);
  const [accounts,  setAccounts]  = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [form,      setForm]      = useState(EMPTY);
  const [editId,    setEditId]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);
  const [search,    setSearch]    = useState('');

  const load = () => api.getReceipts().then(setReceipts).finally(() => setLoading(false));
  useEffect(() => {
    load();
    api.getAccounts().then(setAccounts);
    api.getEmployees().then(emps => setEmployees(emps.filter(e => e.is_active)));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function onSellerChange(sid) {
    set('seller_id', sid);
    if (sid) {
      const emp = employees.find(e => e.id === parseInt(sid));
      if (emp && emp.commission_rate) {
        const comm = ((parseFloat(form.amount) || 0) * emp.commission_rate / 100).toFixed(2);
        set('seller_commission', comm);
      }
    } else {
      set('seller_commission', '');
    }
  }

  function onAmountChange(v) {
    set('amount', v);
    if (form.seller_id) {
      const emp = employees.find(e => e.id === parseInt(form.seller_id));
      if (emp && emp.commission_rate) {
        const comm = ((parseFloat(v) || 0) * emp.commission_rate / 100).toFixed(2);
        set('seller_commission', comm);
      }
    }
  }

  async function save() {
    if (!form.amount || !form.description || !form.payee) {
      setMsg({ type: 'error', text: 'يرجى تعبئة المبلغ والبيان واسم الدافع/المستلم' }); return;
    }
    if (!form.account_id && !form.account_name_manual) {
      setMsg({ type: 'error', text: 'يرجى تحديد الحساب' }); return;
    }
    setSaving(true); setMsg(null);
    try {
      if (editId) {
        await api.updateReceipt(editId, {
          amount: parseFloat(form.amount), description: form.description,
          payee: form.payee, payment_method: form.payment_method,
          account_name_manual: form.account_name_manual,
        }, user.id);
        setMsg({ type: 'success', text: 'تم التعديل بنجاح' });
      } else {
        await api.createReceipt({
          ...form,
          amount: parseFloat(form.amount),
          account_id: form.account_id ? parseInt(form.account_id) : null,
          seller_id: form.seller_id ? parseInt(form.seller_id) : null,
          seller_commission: parseFloat(form.seller_commission) || 0,
          user_id: user.id,
        });
        setMsg({ type: 'success', text: 'تم حفظ السند وتسجيل القيد في اليومية!' });
      }
      setForm(EMPTY); setEditId(null); load();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setSaving(false); }
  }

  async function accept(id) {
    if (!window.confirm('تأكيد اعتماد السند؟')) return;
    try { await api.acceptReceipt(id); load(); } catch (e) { alert(e.message); }
  }

  async function del(id) {
    if (!window.confirm('سيتم حذف السند وقيد اليومية المرتبط به. هل أنت متأكد؟')) return;
    try { await api.deleteReceipt(id, user.id); load(); } catch (e) { alert(e.message); }
  }

  function startEdit(r) {
    setEditId(r.id);
    setForm({ ...EMPTY, ...r, amount: r.amount.toString(), account_name_manual: r.account_name || '' });
    setMsg(null);
    window.scrollTo(0, 0);
  }

  const filtered = receipts.filter(r =>
    !search || r.receipt_no?.includes(search) || r.description?.includes(search) ||
    r.payee?.includes(search) || r.account_name?.includes(search)
  );

  return (
    <div style={{ display: 'flex', gap: '1.5rem', height: '100%' }}>
      {/* ── List ─────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ flex: 2.5, padding: '1.5rem', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--secondary-color)' }}>السندات الأخيرة</h3>
          <input className="custom-input" style={{ width: '200px' }} placeholder="🔍 بحث..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div className="loading-state" />}
          {filtered.map(r => (
            <div key={r.id} className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem',
                      color: r.type === 'قبض' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      {r.receipt_no}
                    </span>
                    <span className={`badge ${r.is_accepted ? 'success' : 'warning'}`}>
                      {r.is_accepted ? 'مقبول' : 'مسودة'}
                    </span>
                    {r.seller_name && (
                      <span className="badge primary" style={{ fontSize: '0.7rem' }}>
                        🧑 {r.seller_name} ({r.seller_commission?.toLocaleString('ar-EG')} ج.م)
                      </span>
                    )}
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {!r.is_accepted && (
                          <button onClick={() => startEdit(r)} title="تعديل"
                            style={{ background: 'var(--primary-light)', border: 'none', borderRadius: '4px',
                              padding: '0.2rem 0.5rem', cursor: 'pointer', color: 'var(--primary-color)' }}>
                            <Edit2 size={12} />
                          </button>
                        )}
                        <button onClick={() => del(r.id)} title="حذف"
                          style={{ background: 'var(--danger-light)', border: 'none', borderRadius: '4px',
                            padding: '0.2rem 0.5rem', cursor: 'pointer', color: 'var(--danger-color)' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    {r.description}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    📅 {r.date} | 👤 {r.payee} | 🏦 {r.account_name}
                  </div>
                </div>
                <div style={{ textAlign: 'left', flexShrink: 0, marginRight: '1rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem',
                    color: r.type === 'قبض' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                    {r.type === 'قبض' ? '+' : '-'}{r.amount?.toLocaleString('ar-EG')} ج.م
                  </div>
                  {!r.is_accepted && (
                    <button className="btn btn-outline" onClick={() => accept(r.id)}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                      اعتماد
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ flex: 2, padding: '1.5rem', display: 'flex',
        flexDirection: 'column', gap: '0.9rem', overflowY: 'auto', minWidth: 0 }}>
        <h3 style={{ color: 'var(--secondary-color)' }}>{editId ? 'تعديل سند' : 'إصدار سند جديد'}</h3>

        {msg && (
          <div style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)',
            background: msg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
            color: msg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 600, fontSize: '0.9rem' }}>
            {msg.text}
          </div>
        )}

        {/* نوع السند */}
        {!editId && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => set('type', t)}
                className={`btn ${form.type === t ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>
                {t === 'قبض' ? '📥 سند قبض' : '📤 سند صرف'}
              </button>
            ))}
          </div>
        )}

        {/* الحساب - combobox */}
        <div className="form-group" style={{ margin: 0 }}>
          <label>الحساب (العميل / المورد)</label>
          <AccountCombobox
            accounts={accounts}
            value_id={form.account_id}
            value_manual={form.account_name_manual}
            onChange={({ account_id, account_name_manual }) =>
              setForm(f => ({ ...f, account_id, account_name_manual }))
            }
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            يمكنك الاختيار من القائمة أو كتابة الاسم يدوياً
          </span>
        </div>

        {/* المبلغ + الدافع */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>المبلغ (ج.م)</label>
            <input type="number" className="custom-input amount-input" placeholder="0.00"
              value={form.amount} onChange={e => onAmountChange(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>اسم الدافع / المستلم</label>
            <input type="text" className="custom-input" placeholder="الاسم"
              value={form.payee} onChange={e => set('payee', e.target.value)} />
          </div>
        </div>

        {/* البيان */}
        <div className="form-group" style={{ margin: 0 }}>
          <label>البيان / تفاصيل العملية</label>
          <input type="text" className="custom-input" placeholder="شرح مبسط للحركة..."
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        {/* البائع + العمولة */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>البائع / الموظف المسؤول</label>
            <select className="custom-input" value={form.seller_id} onChange={e => onSellerChange(e.target.value)}>
              <option value="">-- لا يوجد --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.commission_rate}%)</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>عمولة البيع (ج.م)</label>
            <input type="number" className="custom-input" placeholder="0.00"
              value={form.seller_commission}
              onChange={e => set('seller_commission', e.target.value)} />
          </div>
        </div>

        {/* طريقة الدفع */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600,
            color: 'var(--text-secondary)', fontSize: '0.88rem' }}>طريقة الدفع</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {METHODS.map(m => {
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => set('payment_method', m.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: form.payment_method === m.id ? '2px solid var(--primary-color)' : '1px solid rgba(0,0,0,0.1)',
                    background: form.payment_method === m.id ? 'var(--primary-light)' : 'transparent',
                    color: form.payment_method === m.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                    fontSize: '0.85rem', fontFamily: 'inherit' }}>
                  <Icon size={14} /> {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* تفاصيل الدفع حسب الطريقة */}
        {form.payment_method === 'check' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
            background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>رقم الشيك</label>
              <input className="custom-input" value={form.check_no} onChange={e => set('check_no', e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>البنك</label>
              <input className="custom-input" value={form.bank_name} onChange={e => set('bank_name', e.target.value)} />
            </div>
          </div>
        )}
        {form.payment_method === 'instapay' && (
          <div style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>رقم الموبايل / عنوان انستا باي</label>
              <input className="custom-input" value={form.wallet_no} onChange={e => set('wallet_no', e.target.value)} />
            </div>
          </div>
        )}
        {form.payment_method === 'wallet' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
            background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>رقم المحفظة</label>
              <input className="custom-input" value={form.wallet_no} onChange={e => set('wallet_no', e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>مزود الخدمة</label>
              <select className="custom-input" value={form.wallet_provider} onChange={e => set('wallet_provider', e.target.value)}>
                <option>فودافون كاش</option>
                <option>أورانج كاش</option>
                <option>اتصالات كاش</option>
                <option>وي باي</option>
              </select>
            </div>
          </div>
        )}

        {/* أزرار */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}
            style={{ padding: '0.8rem', fontSize: '1rem' }}>
            <CheckCircle size={18} />
            {saving ? 'جاري الحفظ...' : editId ? 'حفظ التعديلات' : 'اعتماد السند + تسجيل في اليومية'}
          </button>
          {editId && (
            <button className="btn btn-outline" onClick={() => { setEditId(null); setForm(EMPTY); setMsg(null); }}>
              <X size={16} /> إلغاء التعديل
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
