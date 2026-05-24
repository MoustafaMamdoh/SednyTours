import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Users, FileText, ChevronLeft, MapPin, X, Calendar, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { api } from '../api.js';

const EMPTY_TRIP = { trip_name: '', type: 'عمرة', hotel_makkah: '', hotel_madinah: '', nights_makkah: 7, nights_madinah: 4, departure_date: '', return_date: '', price_per_person: '', cost_per_person: '', max_pilgrims: 45 };
const EMPTY_PILGRIM = { full_name: '', passport_no: '', national_id: '', phone: '', amount_paid: '' };

export default function HajjUmrah({ user }) {
  const isAdmin = user?.level === 3;
  const [trips, setTrips]       = useState([]);
  const [form, setForm]         = useState(EMPTY_TRIP);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);
  
  // Drawer state
  const [activeTrip, setActiveTrip] = useState(null);
  const [pilgrims, setPilgrims]     = useState([]);
  const [pForm, setPForm]           = useState(EMPTY_PILGRIM);
  const [showPForm, setShowPForm]   = useState(false);

  const load = () => { api.getTrips().then(setTrips).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setP = (k, v) => setPForm(f => ({ ...f, [k]: v }));

  async function saveTrip() {
    if (!form.trip_name || !form.price_per_person || !form.cost_per_person) return alert('أكمل البيانات الأساسية للرحلة');
    try {
      await api.createTrip({ ...form, price_per_person: +form.price_per_person, cost_per_person: +form.cost_per_person });
      setForm(EMPTY_TRIP); setShowForm(false); load();
    } catch (e) { alert(e.message); }
  }

  async function deleteTrip(id) {
    if(!window.confirm('هل أنت متأكد من حذف هذه الرحلة؟ سيتم حذف جميع المسجلين بها أيضاً!')) return;
    try { await api.deleteTrip(id, user.id); load(); }
    catch(e) { alert(e.message); }
  }

  async function openTrip(t) {
    setActiveTrip(t);
    const ps = await api.getPilgrims(t.id);
    setPilgrims(ps);
  }

  async function savePilgrim() {
    if (!pForm.full_name || !pForm.passport_no) return alert('أدخل الاسم ورقم الجواز');
    try {
      await api.addPilgrim({ ...pForm, trip_id: activeTrip.id, amount_paid: +pForm.amount_paid || 0 });
      setPForm(EMPTY_PILGRIM); setShowPForm(false);
      const ps = await api.getPilgrims(activeTrip.id);
      setPilgrims(ps); load(); // refresh main list for counts
    } catch (e) { alert(e.message); }
  }

  async function deletePilgrim(id) {
    if(!window.confirm('هل أنت متأكد من حذف هذا المعتمر؟')) return;
    try { 
      await api.deletePilgrim(id, user.id); 
      const ps = await api.getPilgrims(activeTrip.id);
      setPilgrims(ps); load(); 
    }
    catch(e) { alert(e.message); }
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
        {/* Main List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={28} color="var(--primary-color)" /> إدارة رحلات الحج والعمرة
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem', fontSize: '0.9rem' }}>{trips.length} رحلة مسجلة في النظام</p>
            </div>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <PlusCircle size={18} /> إضافة رحلة جديدة
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem', overflowY: 'auto', paddingBottom: '2rem' }}>
            {trips.map(t => {
              const progress = Math.min(100, Math.round((t.registered / t.max_pilgrims) * 100)) || 0;
              return (
                <div key={t.id} className="glass-panel" style={{ padding: '1.5rem', cursor: 'pointer', position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s' }}
                     onClick={() => openTrip(t)}
                     onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                     onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                  
                  {isAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); deleteTrip(t.id); }} title="حذف الرحلة"
                      style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'var(--danger-light)', border: 'none', borderRadius: '6px', padding: '0.4rem', cursor: 'pointer', color: 'var(--danger-color)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h3 style={{ color: 'var(--primary-color)', fontSize: '1.1rem' }}>{t.trip_name}</h3>
                    <span className="badge success">{t.status}</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <MapPin size={14} /> {t.hotel_makkah} ▪ {t.hotel_madinah}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <Users size={14} /> {t.registered} / {t.max_pilgrims} معتمر
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <Calendar size={14} /> {t.departure_date || 'غير محدد'}
                    </div>
                  </div>

                  <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? 'var(--danger-color)' : 'var(--primary-color)', borderRadius: '3px', transition: 'width 0.5s' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>متحصلات</div>
                      <div style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>{(t.collected||0).toLocaleString('ar-EG')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>صافي الربح المتوقع</div>
                      <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{(t.expected_profit||0).toLocaleString('ar-EG')}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Trip Modal */}
      {showForm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '600px', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>رحلة جديدة</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>اسم الرحلة</label>
                <input className="custom-input" value={form.trip_name} onChange={e => set('trip_name', e.target.value)} />
              </div>
              <div className="form-group"><label>فندق مكة</label><input className="custom-input" value={form.hotel_makkah} onChange={e => set('hotel_makkah', e.target.value)} /></div>
              <div className="form-group"><label>فندق المدينة</label><input className="custom-input" value={form.hotel_madinah} onChange={e => set('hotel_madinah', e.target.value)} /></div>
              <div className="form-group"><label>تاريخ السفر</label><input type="date" className="custom-input" value={form.departure_date} onChange={e => set('departure_date', e.target.value)} /></div>
              <div className="form-group"><label>تاريخ العودة</label><input type="date" className="custom-input" value={form.return_date} onChange={e => set('return_date', e.target.value)} /></div>
              <div className="form-group"><label>تكلفة الفرد</label><input type="number" className="custom-input amount-input" value={form.cost_per_person} onChange={e => set('cost_per_person', e.target.value)} /></div>
              <div className="form-group"><label>سعر البيع</label><input type="number" className="custom-input amount-input" value={form.price_per_person} onChange={e => set('price_per_person', e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={saveTrip}>حفظ الرحلة</button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Details Drawer */}
      <div className="glass-panel" style={{
        position: 'absolute', top: 0, bottom: 0, left: activeTrip ? 0 : '-100%', width: '550px',
        zIndex: 40, transition: 'left 0.3s ease', display: 'flex', flexDirection: 'column',
        boxShadow: activeTrip ? '10px 0 30px rgba(0,0,0,0.1)' : 'none'
      }}>
        {activeTrip && (
          <>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'var(--primary-color)' }}>{activeTrip.trip_name}</h3>
              <button onClick={() => setActiveTrip(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="var(--text-muted)" /></button>
            </div>

            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ color: 'var(--secondary-color)' }}>قائمة المعتمرين ({pilgrims.length})</h4>
                <button className="btn btn-outline" style={{ padding: '0.4rem 1rem' }} onClick={() => setShowPForm(true)}><PlusCircle size={16} /> إضافة معتمر</button>
              </div>

              {showPForm && (
                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                  <div className="form-group"><input className="custom-input" placeholder="الاسم الرباعي" value={pForm.full_name} onChange={e => setP('full_name', e.target.value)} /></div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{flex:1}}><input className="custom-input" placeholder="رقم الجواز" value={pForm.passport_no} onChange={e => setP('passport_no', e.target.value)} /></div>
                    <div className="form-group" style={{flex:1}}><input type="number" className="custom-input" placeholder="المبلغ المدفوع" value={pForm.amount_paid} onChange={e => setP('amount_paid', e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 1rem' }} onClick={() => setShowPForm(false)}>إلغاء</button>
                    <button className="btn btn-primary" style={{ padding: '0.3rem 1rem' }} onClick={savePilgrim}>حفظ</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pilgrims.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--secondary-color)' }}>{p.full_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.2rem' }}>{p.passport_no}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المدفوع</div>
                        <div style={{ fontWeight: 'bold', color: p.amount_paid >= activeTrip.price_per_person ? 'var(--success-color)' : 'var(--warning-color)' }}>
                            {p.amount_paid.toLocaleString('ar-EG')} / {activeTrip.price_per_person.toLocaleString('ar-EG')}
                        </div>
                        </div>
                        {isAdmin && (
                            <button onClick={() => deletePilgrim(p.id)} title="حذف المعتمر" style={{ background: 'var(--danger-light)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--danger-color)' }}>
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                  </div>
                ))}
                {pilgrims.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا يوجد معتمرين مسجلين في هذه الرحلة حتى الآن</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
