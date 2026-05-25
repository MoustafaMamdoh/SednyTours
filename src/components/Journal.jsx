import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, CheckCircle, Trash2, Edit2, AlertCircle, Download } from 'lucide-react';
import { api } from '../api.js';
import { exportToExcel } from '../utils/excel.js';

/* ── Combobox for Journal ─────────────────────────────── */
function AccountCombobox({ accounts, value_id, value_manual, onChange }) {
  const [query, setQuery] = useState(value_manual || '');
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

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
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <input
        className="custom-input"
        style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', width: '100%' }}
        placeholder="اسم الحساب..."
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, left: 0,
          background: 'white', border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 'var(--radius-md)', zIndex: 999, maxHeight: '200px', overflowY: 'auto'
        }}>
          {filtered.map(a => (
            <div key={a.id} onClick={() => pick(a)}
              style={{ padding: '0.5rem', cursor: 'pointer', fontSize: '0.85rem',
                borderBottom: '1px solid rgba(0,0,0,0.05)' }}
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

export default function Journal({ user }) {
  const isAdmin = user?.level === 3;
  const [entries, setEntries] = useState([]);
  const [stats, setStats]     = useState({ total_debit: 0, total_credit: 0 });
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  // المبسط: إضافة قيد يومية
  const EMPTY_LINE = { account_id: null, account_name_manual: '', debit: '', credit: '', description: '' };
  const [lines, setLines] = useState([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
  const [docNo, setDocNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    api.getJournal({ search }).then(data => {
      setEntries(data.items);
      setStats(data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); api.getAccounts().then(setAccounts); }, [search]);

  const td = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const tc = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const diff = td - tc;

  function setLine(idx, k, v) {
    const newL = [...lines];
    newL[idx][k] = v;
    setLines(newL);
  }

  function addLine() { setLines([...lines, { ...EMPTY_LINE }]); }
  function removeLine(idx) {
    if (lines.length > 2) setLines(lines.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!docNo) { setMsg({ type: 'error', text: 'رقم القيد مطلوب' }); return; }
    if (Math.abs(diff) > 0.01) { setMsg({ type: 'error', text: 'القيد غير متزن' }); return; }
    const validLines = lines.filter(l => (parseFloat(l.debit) || parseFloat(l.credit)) && (l.account_id || l.account_name_manual));
    if (validLines.length < 2) { setMsg({ type: 'error', text: 'يجب إدخال طرفين على الأقل' }); return; }
    
    setSaving(true); setMsg(null);
    try {
      const payload = validLines.map(l => ({
        doc_no: docNo, doc_type: 'JRN',
        account_id: l.account_id,
        account_name_manual: l.account_name_manual,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description || 'قيد تسوية',
        user_id: user.id
      }));
      await api.createJournalEntry(payload);
      setMsg({ type: 'success', text: 'تم تسجيل القيد بنجاح' });
      setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
      setDocNo('');
      load();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!window.confirm('هل أنت متأكد من حذف هذه الحركة؟')) return;
    try { await api.deleteJournalEntry(id, user.id); load(); }
    catch (e) { alert(e.message); }
  }

  function handleExport() {
    const data = entries.map(e => ({
      'المستند': e.doc_no,
      'النوع': e.doc_type,
      'التاريخ': e.date,
      'الحساب': e.account,
      'البيان': e.description,
      'مدين': e.debit || 0,
      'دائن': e.credit || 0
    }));
    exportToExcel(data, 'دفتر_اليومية');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* ── Add Entry Form ──────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.5rem', flexShrink: 0 }}>
        <h3 style={{ color: 'var(--secondary-color)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> إضافة قيد يومية يدوي (تسوية)
        </h3>
        
        {msg && (
          <div style={{ padding: '0.6rem 1rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)',
            background: msg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
            color: msg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 600 }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ width: '200px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>رقم المستند / القيد</label>
            <input className="custom-input" placeholder="JRN-1001" value={docNo} onChange={e => setDocNo(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.02)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي المدين</div>
              <div style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{td.toLocaleString('ar-EG')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي الدائن</div>
              <div style={{ fontWeight: 700, color: 'var(--secondary-color)' }}>{tc.toLocaleString('ar-EG')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الفرق</div>
              <div style={{ fontWeight: 700, color: Math.abs(diff) > 0.01 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                {Math.abs(diff).toLocaleString('ar-EG')}
              </div>
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <th style={{ padding: '0.5rem', textAlign: 'right', width: '25%' }}>الحساب</th>
              <th style={{ padding: '0.5rem', textAlign: 'right', width: '15%' }}>مدين (له)</th>
              <th style={{ padding: '0.5rem', textAlign: 'right', width: '15%' }}>دائن (عليه)</th>
              <th style={{ padding: '0.5rem', textAlign: 'right' }}>البيان</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td style={{ padding: '0.2rem' }}>
                  <AccountCombobox
                    accounts={accounts}
                    value_id={l.account_id}
                    value_manual={l.account_name_manual}
                    onChange={({ account_id, account_name_manual }) => {
                      setLine(i, 'account_id', account_id);
                      setLine(i, 'account_name_manual', account_name_manual);
                    }}
                  />
                </td>
                <td style={{ padding: '0.2rem' }}>
                  <input type="number" className="custom-input amount-input" style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                    placeholder="0" value={l.debit} onChange={e => { setLine(i, 'debit', e.target.value); setLine(i, 'credit', ''); }} />
                </td>
                <td style={{ padding: '0.2rem' }}>
                  <input type="number" className="custom-input amount-input" style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                    placeholder="0" value={l.credit} onChange={e => { setLine(i, 'credit', e.target.value); setLine(i, 'debit', ''); }} />
                </td>
                <td style={{ padding: '0.2rem' }}>
                  <input type="text" className="custom-input" style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                    placeholder="بيان تفصيلي" value={l.description} onChange={e => setLine(i, 'description', e.target.value)} />
                </td>
                <td style={{ padding: '0.2rem', textAlign: 'center' }}>
                  <button onClick={() => removeLine(i)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
          <button className="btn btn-outline" onClick={addLine} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            + إضافة سطر
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving || Math.abs(diff) > 0.01} style={{ padding: '0.6rem 2rem' }}>
            <CheckCircle size={18} /> حفظ القيد
          </button>
        </div>
      </div>

      {/* ── Ledger Data ─────────────────────────────────────── */}
      <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3 style={{ color: 'var(--secondary-color)', margin: 0 }}>دفتر اليومية العامة</h3>
            <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }} onClick={handleExport}>
              <Download size={14} /> تصدير إكسيل
            </button>
          </div>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input className="custom-input" style={{ paddingRight: '2rem' }}
              placeholder="بحث في اليومية..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>المستند</th>
                <th>الحساب</th>
                <th>البيان</th>
                <th>مدين (ج.م)</th>
                <th>دائن (ج.م)</th>
                {isAdmin && <th style={{ width: '40px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>جاري التحميل...</td></tr>
              ) : entries.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize: '0.85rem' }}>{e.date}</td>
                  <td><span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-color)' }}>{e.doc_no}</span></td>
                  <td style={{ fontWeight: 600 }}>{e.account}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{e.description}</td>
                  <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{e.debit ? e.debit.toLocaleString('ar-EG') : '-'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--secondary-color)' }}>{e.credit ? e.credit.toLocaleString('ar-EG') : '-'}</td>
                  {isAdmin && (
                    <td>
                      <button onClick={() => del(e.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
