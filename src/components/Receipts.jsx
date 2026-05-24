import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, FileText, CheckCircle, Wallet, Landmark, CreditCard, X, Trash2, Edit2 } from 'lucide-react';
import { api } from '../api.js';

const TYPES = ['قبض', 'صرف'];
const METHODS = [
  { id: 'cash',     label: 'نقدي',       icon: Wallet },
  { id: 'check',    label: 'شيك',        icon: FileText },
  { id: 'instapay', label: 'انستا باي',  icon: CreditCard },
  { id: 'bank',     label: 'تحويل بنكي', icon: Landmark },
  { id: 'wallet',   label: 'محفظة كاش',  icon: Wallet },
];

const EMPTY = { type: 'قبض', account_id: '', amount: '', description: '', payment_method: 'cash', payee: '', check_no: '', bank_name: '', wallet_no: '', wallet_provider: 'فودافون' };

export default function Receipts({ user }) {
  const isAdmin = user?.level === 3;
  const [receipts, setReceipts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  const load = () => {
    api.getReceipts().then(setReceipts).finally(() => setLoading(false));
  };
  useEffect(() => { load(); api.getAccounts().then(setAccounts); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.account_id || !form.amount || !form.description || !form.payee) {
      setMsg({ type: 'error', text: 'يرجى تعبئة جميع الحقول الإلزامية' }); return;
    }
    setSaving(true); setMsg(null);
    try {
      if (editId) {
        await api.updateReceipt(editId, {
          amount: parseFloat(form.amount), description: form.description,
          payee: form.payee, payment_method: form.payment_method
        }, user.id);
        setMsg({ type: 'success', text: 'تم التعديل بنجاح' });
      } else {
        await api.createReceipt({ ...form, amount: parseFloat(form.amount), user_id: user.id });
        setMsg({ type: 'success', text: 'تم حفظ السند وتسجيل القيد في اليومية!' });
      }
      setForm(EMPTY); setEditId(null); load();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setSaving(false); }
  }

  async function accept(id) {
    if (!window.confirm('هل أنت متأكد من اعتماد هذا السند؟')) return;
    try { await api.acceptReceipt(id); load(); }
    catch (e) { alert(e.message); }
  }

  async function deleteReceipt(id) {
    if (!window.confirm('سيتم حذف السند وإلغاء القيد المرتبط به من اليومية، هل أنت متأكد؟')) return;
    try { await api.deleteReceipt(id, user.id); load(); }
    catch (e) { alert(e.message); }
  }

  function startEdit(r) {
    setEditId(r.id);
    setForm({ ...EMPTY, ...r, amount: r.amount.toString() });
    setMsg(null);
  }

  return (
    <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
      {/* List */}
      <div className="glass-panel" style={{ flex: 2.5, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ color: 'var(--secondary-color)', marginBottom: '1.5rem' }}>السندات الأخيرة</h3>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {receipts.map(r => (
            <div key={r.id} className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: r.type === 'قبض' ? 'var(--success-color)' : 'var(--danger-color)' }}>{r.receipt_no}</span>
                  <span className={`badge ${r.is_accepted ? 'success' : 'warning'}`}>{r.is_accepted ? 'مقبول' : 'مسودة'}</span>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {!r.is_accepted && <button onClick={() => startEdit(r)} style={{ background: 'var(--primary-light)', border: 'none', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer', color: 'var(--primary-color)' }}><Edit2 size={12} /></button>}
                      <button onClick={() => deleteReceipt(r.id)} style={{ background: 'var(--danger-light)', border: 'none', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer', color: 'var(--danger-color)' }}><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{r.description}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.date} | بواسطة: {r.payee}</div>
              </div>
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: r.type === 'قبض' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                  {r.type === 'قبض' ? '+' : '-'}{r.amount.toLocaleString('ar-EG')}
                </div>
                {!r.is_accepted && (
                  <button className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', marginTop: '0.5rem' }} onClick={() => accept(r.id)}>
                    اعتماد السند
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="glass-panel" style={{ flex: 2, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        <h3 style={{ color: 'var(--secondary-color)' }}>{editId ? 'تعديل سند' : 'إصدار سند جديد'}</h3>
        
        {msg && <div style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', background: msg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)', color: msg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 600 }}>{msg.text}</div>}

        {!editId && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => set('type', t)} className={`btn ${form.type === t ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>{t === 'قبض' ? 'سند قبض' : 'سند صرف'}</button>
            ))}
          </div>
        )}

        <div className="form-group">
          <label>الحساب (العميل أو المورد)</label>
          <select className="custom-input" value={form.account_id} onChange={e => set('account_id', parseInt(e.target.value))} disabled={!!editId}>
            <option value="">-- اختر الحساب --</option>
            {accounts.filter(a => a.parent_id != null && !["الخزينة الرئيسية"].includes(a.name)).map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>المبلغ (ج.م)</label>
            <input type="number" className="custom-input amount-input" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div className="form-group">
            <label>اسم المستلم / الدافع</label>
            <input type="text" className="custom-input" placeholder="الاسم" value={form.payee} onChange={e => set('payee', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label>البيان / تفاصيل العملية</label>
          <input type="text" className="custom-input" placeholder="شرح مبسط للحركة..." value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--secondary-color)', fontSize: '0.9rem' }}>طريقة الدفع</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {METHODS.map(m => {
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => set('payment_method', m.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: form.payment_method === m.id ? '2px solid var(--primary-color)' : '1px solid rgba(0,0,0,0.1)', background: form.payment_method === m.id ? 'var(--primary-light)' : 'transparent', color: form.payment_method === m.id ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', flex: 1, minWidth: '100px', justifyContent: 'center' }}>
                  <Icon size={16} /> {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {form.payment_method === 'check' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div className="form-group" style={{ margin: 0 }}><label>رقم الشيك</label><input className="custom-input" value={form.check_no} onChange={e => set('check_no', e.target.value)} /></div>
            <div className="form-group" style={{ margin: 0 }}><label>البنك</label><input className="custom-input" value={form.bank_name} onChange={e => set('bank_name', e.target.value)} /></div>
          </div>
        )}

        {form.payment_method === 'instapay' && (
          <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div className="form-group" style={{ margin: 0 }}><label>رقم الموبايل / عنوان انستا باي</label><input className="custom-input" value={form.wallet_no} onChange={e => set('wallet_no', e.target.value)} /></div>
          </div>
        )}

        {form.payment_method === 'wallet' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div className="form-group" style={{ margin: 0 }}><label>رقم المحفظة</label><input className="custom-input" value={form.wallet_no} onChange={e => set('wallet_no', e.target.value)} /></div>
            <div className="form-group" style={{ margin: 0 }}><label>مزود الخدمة</label><select className="custom-input" value={form.wallet_provider} onChange={e => set('wallet_provider', e.target.value)}><option>فودافون كاش</option><option>أورانج كاش</option><option>اتصالات كاش</option><option>وي باي</option></select></div>
          </div>
        )}

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '0.8rem', fontSize: '1rem' }}>
            <CheckCircle size={18} /> {editId ? 'حفظ التعديلات' : 'اعتماد السند + تسجيل في اليومية'}
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
