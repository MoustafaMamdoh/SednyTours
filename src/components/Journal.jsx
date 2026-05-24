import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Download, Search, PlusCircle, X, CheckCircle, Trash2 } from 'lucide-react';
import { api } from '../api.js';

export default function Journal({ user }) {
  const isAdmin = user?.level === 3;
  const [data, setData]     = useState({ items: [], total_debit: 0, total_credit: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from_date: '', to_date: '', account_id: '', search: '' });
  const [accounts, setAccounts] = useState([]);
  
  // Manual Entry State
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryMsg, setEntryMsg] = useState(null);
  const [entrySaving, setEntrySaving] = useState(false);
  const [newEntry, setNewEntry] = useState({
    doc_no: `JRN-${Math.floor(Math.random()*10000)}`,
    description: '',
    entry_date: new Date().toISOString().split('T')[0],
    lines: [
      { account_id: '', debit: '', credit: '' },
      { account_id: '', debit: '', credit: '' }
    ]
  });

  const load = (f = filters) => {
    setLoading(true);
    api.getJournal(f).then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); api.getAccounts().then(setAccounts); }, []);
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  // Manual Entry Handlers
  const handleLineChange = (index, field, value) => {
    const lines = [...newEntry.lines];
    lines[index][field] = value;
    if (field === 'debit' && value) lines[index]['credit'] = '';
    if (field === 'credit' && value) lines[index]['debit'] = '';
    setNewEntry({ ...newEntry, lines });
  };
  const addLine = () => setNewEntry({ ...newEntry, lines: [...newEntry.lines, { account_id: '', debit: '', credit: '' }] });
  const removeLine = (idx) => setNewEntry({ ...newEntry, lines: newEntry.lines.filter((_, i) => i !== idx) });

  const totalDebit = newEntry.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = newEntry.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const saveEntry = async () => {
    if (!newEntry.description) { setEntryMsg({ type: 'error', text: 'يرجى إدخال البيان العام للقيد' }); return; }
    if (!isBalanced) { setEntryMsg({ type: 'error', text: 'القيد غير متزن!' }); return; }
    
    // Filter out empty lines
    const validLines = newEntry.lines.filter(l => l.account_id && (l.debit || l.credit));
    if (validLines.length < 2) { setEntryMsg({ type: 'error', text: 'يجب اختيار حسابين على الأقل' }); return; }

    const payload = validLines.map(l => ({
      doc_no: newEntry.doc_no,
      doc_type: "JRN",
      description: newEntry.description,
      account_id: parseInt(l.account_id),
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
      entry_date: newEntry.entry_date,
      user_id: user.id
    }));

    setEntrySaving(true);
    setEntryMsg(null);
    try {
      await api.createJournal(payload);
      setEntryMsg({ type: 'success', text: 'تم حفظ القيد اليدوي بنجاح!' });
      setTimeout(() => {
        setShowEntryForm(false);
        setNewEntry({
          doc_no: `JRN-${Math.floor(Math.random()*10000)}`,
          description: '', entry_date: new Date().toISOString().split('T')[0],
          lines: [{ account_id: '', debit: '', credit: '' }, { account_id: '', debit: '', credit: '' }]
        });
        load();
      }, 1500);
    } catch (err) {
      setEntryMsg({ type: 'error', text: err.message });
    } finally {
      setEntrySaving(false);
    }
  };

  const deleteEntry = async (id) => {
    if(!window.confirm('حذف هذا السطر من القيد سيؤدي إلى خلل في توازن القيود، هل أنت متأكد من الحذف؟')) return;
    try {
        await api.deleteJournal(id, user.id);
        load();
    } catch(e) {
        alert(e.message);
    }
  };

  return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileSpreadsheet size={28} color="var(--primary-color)" />
            دفتر اليومية العامة
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem', fontSize: '0.9rem' }}>
            كافة الحركات المُسمَّعة من جميع أقسام النظام — إجمالي {data.total} قيد
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" style={{ padding: '0.5rem 1.2rem', borderColor: 'var(--success-color)', color: 'var(--success-color)' }} onClick={() => setShowEntryForm(true)}>
            <PlusCircle size={18} /> إضافة قيد يومية
          </button>
          <button className="btn btn-primary" style={{ padding: '0.5rem 1.2rem' }}>
            <Download size={18} /> تصدير Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ display: 'flex', gap: '1rem', padding: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.8rem' }}>من تاريخ</label>
          <input type="date" className="custom-input" value={filters.from_date} onChange={e => set('from_date', e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.8rem' }}>إلى تاريخ</label>
          <input type="date" className="custom-input" value={filters.to_date} onChange={e => set('to_date', e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1.5, minWidth: '200px' }}>
          <label style={{ fontSize: '0.8rem' }}>تصفية بالحساب</label>
          <select className="custom-input" value={filters.account_id} onChange={e => set('account_id', e.target.value)}>
            <option value="">جميع الحسابات</option>
            {accounts.filter(a => a.parent_id != null).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: 2, minWidth: '250px' }}>
          <label style={{ fontSize: '0.8rem' }}>بحث في البيان أو رقم المستند</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="custom-input" style={{ paddingRight: '2.5rem' }} placeholder="اكتب للبحث..."
              value={filters.search} onChange={e => set('search', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-primary" style={{ padding: '0.7rem 1.5rem' }} onClick={() => load()}>بحث</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div className="loading-state" />
        ) : data.items.length === 0 ? (
          <div className="error-state">لا توجد حركات مالية مطابقة للبحث</div>
        ) : (
          <table className="custom-table" style={{ margin: 0 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
              <tr>
                <th>التاريخ</th>
                <th>رقم المستند</th>
                <th>الحساب</th>
                <th>البيان</th>
                <th style={{ textAlign: 'center' }}>مدين (له)</th>
                <th style={{ textAlign: 'center' }}>دائن (عليه)</th>
                {isAdmin && <th style={{width: '50px'}}></th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontSize: '0.85rem' }}>{item.date}</td>
                  <td><span className="badge warning" style={{ fontFamily: 'monospace' }}>{item.doc_no}</span></td>
                  <td style={{ fontWeight: 600 }}>{item.account}</td>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-color)', fontWeight: 'bold' }}>{item.debit > 0 ? item.debit.toLocaleString('ar-EG') : '—'}</td>
                  <td style={{ textAlign: 'center', color: 'var(--danger-color)',  fontWeight: 'bold' }}>{item.credit > 0 ? item.credit.toLocaleString('ar-EG') : '—'}</td>
                  {isAdmin && (
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => deleteEntry(item.id)} title="حذف"
                        style={{ background: 'var(--danger-light)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--danger-color)' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot style={{ position: 'sticky', bottom: 0, background: 'var(--primary-color)', color: 'white' }}>
              <tr>
                <td colSpan="4" style={{ padding: '0.875rem 1rem', fontWeight: 'bold', background: 'transparent' }}>إجمالي الفترة المحددة:</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', background: 'transparent' }}>{data.total_debit.toLocaleString('ar-EG')}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', background: 'transparent' }}>{data.total_credit.toLocaleString('ar-EG')}</td>
                {isAdmin && <td style={{background: 'transparent'}}></td>}
              </tr>
            </tfoot>
          </table>
          )
        }
      </div>

      {/* Manual Entry Drawer */}
      {showEntryForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }} onClick={() => setShowEntryForm(false)}>
          <div className="glass-panel" style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: 'var(--secondary-color)' }}>إنشاء قيد يومية يدوي</h2>
              <button onClick={() => setShowEntryForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>

            {entryMsg && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: entryMsg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)', color: entryMsg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 600 }}>
                {entryMsg.text}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1rem' }}>
              <div className="form-group">
                <label>رقم القيد</label>
                <input className="custom-input" value={newEntry.doc_no} onChange={e => setNewEntry({...newEntry, doc_no: e.target.value})} />
              </div>
              <div className="form-group">
                <label>التاريخ</label>
                <input type="date" className="custom-input" value={newEntry.entry_date} onChange={e => setNewEntry({...newEntry, entry_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>البيان العام</label>
                <input className="custom-input" placeholder="وصف سبب القيد..." value={newEntry.description} onChange={e => setNewEntry({...newEntry, description: e.target.value})} />
              </div>
            </div>

            <table className="custom-table" style={{ margin: 0 }}>
              <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                <tr>
                  <th style={{ width: '40%' }}>الحساب</th>
                  <th>مدين (منه)</th>
                  <th>دائن (له)</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {newEntry.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>
                      <select className="custom-input" style={{ width: '100%', padding: '0.4rem' }} value={line.account_id} onChange={e => handleLineChange(idx, 'account_id', e.target.value)}>
                        <option value="">-- اختر الحساب --</option>
                        {accounts.filter(a => a.parent_id != null).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </td>
                    <td><input type="number" className="custom-input" placeholder="0" value={line.debit} onChange={e => handleLineChange(idx, 'debit', e.target.value)} disabled={!!line.credit} /></td>
                    <td><input type="number" className="custom-input" placeholder="0" value={line.credit} onChange={e => handleLineChange(idx, 'credit', e.target.value)} disabled={!!line.debit} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <button style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }} onClick={() => removeLine(idx)}><X size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-outline" style={{ padding: '0.4rem 1rem' }} onClick={addLine}><PlusCircle size={16} /> إضافة سطر</button>
              
              <div style={{ display: 'flex', gap: '2rem', background: 'rgba(0,0,0,0.03)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
                <div>إجمالي المدين: <span style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>{totalDebit.toLocaleString('ar-EG')}</span></div>
                <div>إجمالي الدائن: <span style={{ fontWeight: 'bold', color: 'var(--danger-color)' }}>{totalCredit.toLocaleString('ar-EG')}</span></div>
                <div style={{ fontWeight: 'bold', color: isBalanced ? 'var(--success-color)' : 'var(--danger-color)' }}>
                  {isBalanced ? '✓ متزن' : '✗ غير متزن'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setShowEntryForm(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={saveEntry} disabled={entrySaving || !isBalanced}>
                <CheckCircle size={18} /> {entrySaving ? 'جاري الحفظ...' : 'حفظ القيد وتسجيله'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
