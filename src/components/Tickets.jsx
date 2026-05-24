import React, { useEffect, useState } from 'react';
import { Plane, PlusCircle, Search, X, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { api } from '../api.js';

const AIRLINES = ['مصر للطيران','الخطوط السعودية','طيران الإمارات','طيران ناس','طيران الجزيرة','النيل للطيران','فلاي دبي','فلاي ناس'];
const EMPTY = { pnr: '', airline: 'مصر للطيران', passenger_name: '', route: '', cost_price: '', sell_price: '', ticket_type: 'اقتصادي' };

export default function Tickets({ user }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats]     = useState({ sold: 0, returned: 0, total_profit: 0 });
  const [form, setForm]       = useState(EMPTY);
  const [editId, setEditId]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);
  const [search, setSearch]   = useState('');
  const isAdmin = user?.level === 3;

  const load = () => { api.getTickets().then(setTickets); api.getTicketsStats().then(setStats); };
  useEffect(() => { load(); }, []);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.pnr || !form.passenger_name || !form.cost_price || !form.sell_price) {
      setMsg({ type: 'error', text: 'يرجى تعبئة جميع الحقول المطلوبة.' }); return;
    }
    setLoading(true); setMsg(null);
    try {
      if (editId) {
        await api.updateTicket(editId, {
          airline: form.airline, passenger_name: form.passenger_name,
          route: form.route, cost_price: +form.cost_price, sell_price: +form.sell_price
        }, user.id);
        setMsg({ type: 'success', text: 'تم تحديث التذكرة بنجاح' });
      } else {
        await api.createTicket({ ...form, cost_price: +form.cost_price, sell_price: +form.sell_price, period_id: 1, user_id: user.id });
        setMsg({ type: 'success', text: 'تم حفظ التذكرة بنجاح!' });
      }
      setForm(EMPTY); setEditId(null); load();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  }

  async function deleteTicket(id) {
    if (!window.confirm('هل أنت متأكد من حذف هذه التذكرة؟')) return;
    try { await api.deleteTicket(id, user.id); load(); }
    catch (e) { alert(e.message); }
  }

  function startEdit(t) {
    setEditId(t.id);
    setForm({ pnr: t.pnr, airline: t.airline, passenger_name: t.passenger_name,
              route: t.route, cost_price: t.cost_price, sell_price: t.sell_price, ticket_type: t.ticket_type });
    setMsg(null);
  }

  const filtered = tickets.filter(t =>
    t.pnr.toLowerCase().includes(search.toLowerCase()) ||
    t.passenger_name.includes(search) || t.route.includes(search)
  );

  return (
    <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
      {/* List */}
      <div className="glass-panel" style={{ flex: 2.5, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'مباعة',         value: stats.sold,     cls: 'success' },
            { label: 'مرتجعة',        value: stats.returned, cls: 'danger' },
            { label: 'إجمالي الأرباح', value: `${(stats.total_profit||0).toLocaleString('ar-EG')} ج.م`, cls: 'primary' },
          ].map(s => (
            <div key={s.label} className={`stat-card glass-card ${s.cls}`} style={{ padding: '1rem' }}>
              <span className="stat-title" style={{ fontSize: '0.8rem' }}>{s.label}</span>
              <div className="stat-value" style={{ fontSize: '1.4rem', marginTop: '0.3rem' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--secondary-color)' }}>سجل التذاكر</h3>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 1rem', gap: '0.5rem' }}>
            <Search size={15} color="var(--text-muted)" />
            <input placeholder="بحث بـ PNR أو الراكب..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem' }} />
            {search && <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table className="custom-table">
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
              <tr>
                <th>التاريخ</th><th>PNR</th><th>الراكب</th><th>خط السير</th>
                <th style={{ textAlign: 'center' }}>سعر البيع</th>
                <th style={{ textAlign: 'center' }}>العمولة</th>
                <th>الحالة</th>
                {isAdmin && <th>إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{t.date}</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{t.pnr}</td>
                  <td>{t.passenger_name}</td>
                  <td><span style={{ background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 'bold' }}>{t.route}</span></td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{(+t.sell_price).toLocaleString('ar-EG')}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success-color)' }}>{(+t.profit).toLocaleString('ar-EG')}</td>
                  <td><span className={`badge ${t.status === 'مباعة' ? 'success' : 'danger'}`}>{t.status}</span></td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => startEdit(t)} title="تعديل"
                          style={{ background: 'var(--primary-light)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--primary-color)' }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => deleteTicket(t.id)} title="حذف"
                          style={{ background: 'var(--danger-light)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--danger-color)' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>لا توجد نتائج</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Form */}
      <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ color: 'var(--secondary-color)' }}>{editId ? 'تعديل التذكرة' : 'إصدار تذكرة جديدة'}</h3>
        {msg && <div style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', background: msg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)', color: msg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 600, fontSize: '0.88rem' }}>{msg.text}</div>}

        {[
          ['رقم الحجز (PNR)', 'pnr', 'text', 'مثال: RX89Y2'],
          ['اسم الراكب الرباعي', 'passenger_name', 'text', 'الاسم كما في الجواز'],
          ['خط السير', 'route', 'text', 'مثال: CAI → JED'],
        ].map(([lbl, key, type, ph]) => (
          <div className="form-group" key={key}>
            <label>{lbl}</label>
            <input type={type} className="custom-input" placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} disabled={editId && key === 'pnr'} />
          </div>
        ))}
        <div className="form-group">
          <label>شركة الطيران</label>
          <select className="custom-input" value={form.airline} onChange={e => set('airline', e.target.value)}>
            {AIRLINES.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>نوع التذكرة</label>
          <select className="custom-input" value={form.ticket_type} onChange={e => set('ticket_type', e.target.value)}>
            <option>اقتصادي</option><option>رجال الأعمال</option><option>أول</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label>سعر الشراء</label>
            <input type="number" className="custom-input amount-input" placeholder="0" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} />
          </div>
          <div className="form-group">
            <label>سعر البيع</label>
            <input type="number" className="custom-input amount-input" placeholder="0" style={{ color: 'var(--success-color)' }} value={form.sell_price} onChange={e => set('sell_price', e.target.value)} />
          </div>
        </div>
        {form.cost_price && form.sell_price && (
          <div style={{ background: 'var(--success-light)', color: 'var(--success-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.9rem' }}>
            العمولة (الربح): {((+form.sell_price) - (+form.cost_price)).toLocaleString('ar-EG')} ج.م
          </div>
        )}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={save} disabled={loading}>
            {editId ? <><CheckCircle size={18} /> حفظ التعديلات</> : <><PlusCircle size={18} /> حفظ التذكرة</>}
            {loading && ' ...'}
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
