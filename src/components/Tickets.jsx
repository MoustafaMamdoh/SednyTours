import React, { useEffect, useState, useRef } from 'react';
import { PlusCircle, Search, Edit2, Trash2, CheckCircle, X, Plane, Download } from 'lucide-react';
import { api } from '../api.js';
import { exportToExcel } from '../utils/excel.js';

const EMPTY = { pnr: '', airline: '', passenger_name: '', route: '', cost_price: '', sell_price: '', ticket_type: 'اقتصادي', seller_id: '', seller_commission: '' };
const TYPES = ['اقتصادي', 'أعمال', 'أول'];

/* ── Combobox for Airlines ────────────────────────────── */
function AirlineCombobox({ airlines, value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = query ? airlines.filter(a => a.includes(query)) : airlines;

  function pick(a) {
    setQuery(a); setOpen(false); onChange(a);
  }

  function handleInput(v) {
    setQuery(v); setOpen(true); onChange(v);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="custom-input" placeholder="مثال: مصر للطيران"
        value={query} onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)} autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0,
          background: 'white', border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 'var(--radius-md)', zIndex: 999, maxHeight: '150px', overflowY: 'auto'
        }}>
          {filtered.map(a => (
            <div key={a} onClick={() => pick(a)}
              style={{ padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.9rem',
                borderBottom: '1px solid rgba(0,0,0,0.04)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              {a}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Tickets({ user }) {
  const isAdmin = user?.level === 3;
  const [tickets, setTickets] = useState([]);
  const [stats, setStats]     = useState({ sold: 0, returned: 0, total_profit: 0 });
  const [airlines, setAirlines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(EMPTY);
  const [editId, setEditId]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);
  const [search, setSearch]   = useState('');

  const load = () => {
    api.getTickets().then(setTickets);
    api.getTicketStats().then(setStats);
    api.getAirlines().then(setAirlines).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.getEmployees().then(emps => setEmployees(emps.filter(e => e.is_active)));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function onSellerChange(sid) {
    set('seller_id', sid);
    if (sid) {
      const emp = employees.find(e => e.id === parseInt(sid));
      if (emp && emp.commission_rate) {
        const comm = ((parseFloat(form.sell_price) || 0) * emp.commission_rate / 100).toFixed(2);
        set('seller_commission', comm);
      }
    } else {
      set('seller_commission', '');
    }
  }

  function onSellPriceChange(v) {
    set('sell_price', v);
    if (form.seller_id) {
      const emp = employees.find(e => e.id === parseInt(form.seller_id));
      if (emp && emp.commission_rate) {
        const comm = ((parseFloat(v) || 0) * emp.commission_rate / 100).toFixed(2);
        set('seller_commission', comm);
      }
    }
  }

  async function save() {
    if (!form.pnr || !form.passenger_name || !form.cost_price || !form.sell_price || !form.airline) {
      setMsg({ type: 'error', text: 'يرجى تعبئة جميع الحقول المطلوبة' }); return;
    }
    setSaving(true); setMsg(null);
    try {
      const payload = {
        ...form,
        cost_price: parseFloat(form.cost_price),
        sell_price: parseFloat(form.sell_price),
        seller_id: form.seller_id ? parseInt(form.seller_id) : null,
        seller_commission: parseFloat(form.seller_commission) || 0,
      };
      
      if (editId) {
        await api.updateTicket(editId, payload, user.id);
        setMsg({ type: 'success', text: 'تم التعديل بنجاح' });
      } else {
        await api.createTicket({ ...payload, user_id: user.id });
        setMsg({ type: 'success', text: 'تم تسجيل التذكرة بنجاح' });
      }
      setForm(EMPTY); setEditId(null); load();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setSaving(false); }
  }

  async function updateStatus(id, newStatus) {
    if (!isAdmin) return;
    try { await api.updateTicket(id, { status: newStatus }, user.id); load(); }
    catch (e) { alert(e.message); }
  }

  async function del(id) {
    if (!window.confirm('سيتم حذف التذكرة نهائياً. متأكد؟')) return;
    try { await api.deleteTicket(id, user.id); load(); }
    catch (e) { alert(e.message); }
  }

  function startEdit(t) {
    setEditId(t.id);
    setForm({ ...EMPTY, ...t, cost_price: t.cost_price.toString(), sell_price: t.sell_price.toString() });
    setMsg(null);
    window.scrollTo(0, 0);
  }

  const filtered = tickets.filter(t =>
    !search || t.pnr.includes(search) || t.passenger_name.includes(search) || t.airline.includes(search)
  );

  function handleExport() {
    const data = filtered.map(t => ({
      'PNR': t.pnr,
      'التاريخ': t.date,
      'الشركة': t.airline,
      'خط السير': t.route,
      'اسم الراكب': t.passenger_name,
      'الدرجة': t.ticket_type,
      'سعر الشراء': t.cost_price,
      'سعر البيع': t.sell_price,
      'الربح': t.profit,
      'البائع': t.seller_name || '-',
      'العمولة': t.seller_commission || 0,
      'الحالة': t.status
    }));
    exportToExcel(data, 'تذاكر_الطيران');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* ── Stats ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', flexShrink: 0 }}>
        <div className="glass-card stat-card" style={{ padding: '1.5rem' }}>
          <div className="stat-title">تذاكر مباعة</div>
          <div className="stat-value" style={{ color: 'var(--primary-color)' }}>{stats.sold}</div>
        </div>
        <div className="glass-card stat-card" style={{ padding: '1.5rem' }}>
          <div className="stat-title">تذاكر مرتجعة</div>
          <div className="stat-value" style={{ color: 'var(--danger-color)' }}>{stats.returned}</div>
        </div>
        <div className="glass-card stat-card" style={{ padding: '1.5rem' }}>
          <div className="stat-title">صافي الربح</div>
          <div className="stat-value" style={{ color: 'var(--success-color)' }}>{stats.total_profit.toLocaleString('ar-EG')} ج.م</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* ── List ────────────────────────────────────────────── */}
        <div className="glass-panel" style={{ flex: 2.5, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3 style={{ color: 'var(--secondary-color)', margin: 0 }}>سجل التذاكر</h3>
              <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }} onClick={handleExport}>
                <Download size={14} /> تصدير إكسيل
              </button>
            </div>
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={16} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input className="custom-input" style={{ paddingRight: '2rem' }}
                placeholder="بحث PNR أو راكب..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>PNR</th>
                  <th>الشركة / خط السير</th>
                  <th>اسم الراكب</th>
                  <th>الماليات</th>
                  <th>البائع</th>
                  <th>الحالة</th>
                  {isAdmin && <th>إجراء</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>جاري التحميل...</td></tr>
                ) : filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary-color)' }}>{t.pnr}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.date}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.airline}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.route} <Plane size={12} style={{ display: 'inline' }} /></div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{t.passenger_name} <span className="badge" style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem' }}>{t.ticket_type}</span></td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>شراء: {t.cost_price?.toLocaleString('ar-EG')}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)' }}>بيع: {t.sell_price?.toLocaleString('ar-EG')}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: t.profit > 0 ? 'var(--success-color)' : (t.profit < 0 ? 'var(--danger-color)' : 'var(--text-secondary)') }}>
                        ربح: {t.profit?.toLocaleString('ar-EG')}
                      </div>
                    </td>
                    <td>
                      {t.seller_name ? (
                        <>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.seller_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--success-color)' }}>عمولة: {t.seller_commission?.toLocaleString('ar-EG')}</div>
                        </>
                      ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td>
                      <select className="custom-input" style={{ padding: '0.3rem', fontSize: '0.85rem', width: 'auto',
                        background: t.status === 'مباعة' ? 'var(--success-light)' : (t.status === 'مرتجعة' ? 'var(--warning-light)' : 'var(--danger-light)'),
                        color: t.status === 'مباعة' ? 'var(--success-color)' : (t.status === 'مرتجعة' ? 'var(--warning-color)' : 'var(--danger-color)'),
                        fontWeight: 600, border: 'none' }}
                        value={t.status} onChange={e => updateStatus(t.id, e.target.value)} disabled={!isAdmin}>
                        <option>مباعة</option><option>مرتجعة</option><option>ملغية</option>
                      </select>
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => startEdit(t)} style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                          <button onClick={() => del(t.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Form ────────────────────────────────────────────── */}
        <div className="glass-panel" style={{ flex: 1.5, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <h3 style={{ color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={20} /> {editId ? 'تعديل تذكرة' : 'إصدار تذكرة جديدة'}
          </h3>

          {msg && (
            <div style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)',
              background: msg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
              color: msg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 600 }}>
              {msg.text}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>رقم الحجز (PNR)</label>
              <input type="text" className="custom-input" placeholder="6 رموز وأرقام" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                value={form.pnr} onChange={e => set('pnr', e.target.value.toUpperCase())} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>اسم الراكب</label>
              <input type="text" className="custom-input" placeholder="اسم الراكب ثلاثي"
                value={form.passenger_name} onChange={e => set('passenger_name', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>شركة الطيران</label>
              <AirlineCombobox airlines={airlines} value={form.airline} onChange={v => set('airline', v)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>خط السير</label>
              <input type="text" className="custom-input" placeholder="CAI - JED"
                value={form.route} onChange={e => set('route', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>سعر التكلفة (شراء)</label>
              <input type="number" className="custom-input amount-input" placeholder="0"
                value={form.cost_price} onChange={e => set('cost_price', e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>سعر البيع (للعميل)</label>
              <input type="number" className="custom-input amount-input" placeholder="0"
                value={form.sell_price} onChange={e => onSellPriceChange(e.target.value)} />
            </div>
          </div>
          
          <div style={{ padding: '1rem', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: 'var(--success-color)', fontWeight: 700, textAlign: 'center', fontSize: '1.1rem' }}>
            الربح المتوقع: {((parseFloat(form.sell_price) || 0) - (parseFloat(form.cost_price) || 0)).toLocaleString('ar-EG')} ج.م
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>درجة التذكرة</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {TYPES.map(t => (
                <button key={t} onClick={() => set('ticket_type', t)}
                  className={`btn ${form.ticket_type === t ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, padding: '0.5rem' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* البائع + العمولة */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>البائع (Sales Agent)</label>
              <select className="custom-input" value={form.seller_id} onChange={e => onSellerChange(e.target.value)}>
                <option value="">-- مباشر --</option>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '0.8rem', fontSize: '1rem' }}>
              <CheckCircle size={18} /> {editId ? 'حفظ التعديلات' : 'تسجيل التذكرة'}
            </button>
            {editId && (
              <button className="btn btn-outline" onClick={() => { setEditId(null); setForm(EMPTY); setMsg(null); }}>
                <X size={16} /> إلغاء التعديل
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
