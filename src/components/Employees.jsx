import React, { useEffect, useState } from 'react';
import { Users, UserPlus, FileSpreadsheet, Calculator, Edit2, Trash2, CheckCircle, X, Download, FileOutput } from 'lucide-react';
import { api } from '../api.js';
import { exportToExcel } from '../utils/excel.js';

const EMPTY_EMP = { name: '', job_title: '', base_salary: '', commission_rate: '' };

/* Salary Row Component to handle local state during typing */
function SalaryRow({ s, isAdmin, onUpdate }) {
  const [vals, setVals] = useState({
    bonus: s.bonus, commission: s.commission,
    deductions: s.deductions, guarantee: s.guarantee
  });

  // Sync if props change
  useEffect(() => {
    setVals({ bonus: s.bonus, commission: s.commission, deductions: s.deductions, guarantee: s.guarantee });
  }, [s]);

  const handleChange = (field, val) => setVals(prev => ({ ...prev, [field]: val }));
  const handleBlur = (field) => isAdmin && onUpdate(s.id, field, vals[field]);

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600 }}>{s.employee_name}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.job_title}</div>
      </td>
      <td style={{ fontWeight: 'bold' }}>{s.base_salary.toLocaleString('ar-EG')}</td>
      <td>
        <input type="number" className="custom-input" style={{ width: '90px', textAlign: 'center', padding: '0.3rem', color: 'var(--success-color)' }}
          value={vals.bonus} onChange={e => handleChange('bonus', e.target.value)} onBlur={() => handleBlur('bonus')} disabled={!isAdmin} />
      </td>
      <td>
        <input type="number" className="custom-input" style={{ width: '90px', textAlign: 'center', padding: '0.3rem', color: 'var(--success-color)' }}
          value={vals.commission} onChange={e => handleChange('commission', e.target.value)} onBlur={() => handleBlur('commission')} disabled={!isAdmin} />
      </td>
      <td>
        <input type="number" className="custom-input" style={{ width: '90px', textAlign: 'center', padding: '0.3rem', color: 'var(--danger-color)' }}
          value={vals.deductions} onChange={e => handleChange('deductions', e.target.value)} onBlur={() => handleBlur('deductions')} disabled={!isAdmin} />
      </td>
      <td>
        <input type="number" className="custom-input" style={{ width: '90px', textAlign: 'center', padding: '0.3rem', color: 'var(--warning-color)' }}
          value={vals.guarantee} onChange={e => handleChange('guarantee', e.target.value)} onBlur={() => handleBlur('guarantee')} disabled={!isAdmin} />
      </td>
      <td style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary-color)' }}>
        {s.net_salary?.toLocaleString('ar-EG')} ج.م
      </td>
    </tr>
  );
}

export default function Employees({ user }) {
  const isAdmin = user?.level === 3;
  const [tab, setTab] = useState('list');
  
  const [employees, setEmployees] = useState([]);
  const [form, setForm]           = useState(EMPTY_EMP);
  const [editId, setEditId]       = useState(null);
  
  const [salaries, setSalaries]   = useState([]);
  const [periods, setPeriods]     = useState([]);
  const [period, setPeriod]       = useState(1);
  const [payrollLoading, setPayrollLoading] = useState(false);

  const load = () => api.getEmployees().then(setEmployees);
  const loadSalaries = (pid) => api.getSalaries(pid).then(setSalaries);
  const loadPeriods = () => {
    api.getPeriods().then(p => {
      setPeriods(p);
      if(p.length > 0) setPeriod(p[0].id);
    });
  };

  useEffect(() => { load(); loadPeriods(); }, []);
  useEffect(() => { if (period) loadSalaries(period); }, [period]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function saveEmp() {
    if (!form.name || !form.job_title || !form.base_salary) return alert('أكمل جميع البيانات');
    try {
      const payload = {
        ...form,
        base_salary: parseFloat(form.base_salary),
        commission_rate: parseFloat(form.commission_rate) || 0
      };
      if (editId) {
        await api.updateEmployee(editId, payload, user.id);
      } else {
        await api.createEmployee(payload);
      }
      setForm(EMPTY_EMP); setEditId(null); load();
    } catch (e) { alert(e.message); }
  }

  async function deleteEmp(id) {
    if(!window.confirm('إيقاف تفعيل الموظف؟ (لن يظهر في كشف الرواتب القادم)')) return;
    try { await api.deleteEmployee(id, user.id); load(); } catch(e) { alert(e.message); }
  }

  function startEdit(e) {
    setEditId(e.id);
    setForm({ name: e.name, job_title: e.job_title, base_salary: e.base_salary, commission_rate: e.commission_rate });
  }

  async function runPayroll() {
    if (!window.confirm('سيتم إنشاء الرواتب وسحب العمولات من تذاكر وسندات هذا الشهر. المتابعة؟')) return;
    setPayrollLoading(true);
    try {
      await api.runPayroll(period);
      loadSalaries(period);
    } catch (e) { alert(e.message); }
    finally { setPayrollLoading(false); }
  }

  async function updateSalaryRow(sid, field, value) {
    try {
      await api.updateSalary(sid, { [field]: parseFloat(value) || 0 }, user.id);
      loadSalaries(period); // Reload to get updated net_salary
    } catch (e) { alert(e.message); }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        {[
          { id: 'list', label: 'دليل الموظفين والعمولات', icon: Users },
          { id: 'payroll', label: 'كشوف الرواتب', icon: FileSpreadsheet }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem',
                borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 600,
                background: tab === t.id ? 'var(--primary-color)' : 'transparent',
                color: tab === t.id ? 'white' : 'var(--text-secondary)'
              }}>
              <Icon size={16} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Employees List ─────────────────────────────────────── */}
      {tab === 'list' && (
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
          <div className="glass-panel" style={{ flex: 2.5, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--secondary-color)', margin: 0 }}>بيانات الموظفين والوكلاء</h3>
              <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }} onClick={() => {
                const data = employees.map(e => ({
                  'الرقم': e.id,
                  'الاسم': e.name,
                  'الوظيفة': e.job_title,
                  'الراتب الأساسي': e.base_salary,
                  'نسبة العمولة': `${e.commission_rate}%`,
                  'الحالة': e.is_active ? 'نشط' : 'موقوف'
                }));
                exportToExcel(data, 'الموظفين');
              }}>
                <FileOutput size={14} /> تصدير إكسيل
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>الرقم</th><th>الاسم</th><th>الوظيفة</th>
                    <th>الراتب الأساسي</th><th>نسبة العمولة %</th>
                    <th>الحالة</th>{isAdmin && <th>إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id}>
                      <td>{e.id}</td><td style={{ fontWeight: 600 }}>{e.name}</td><td>{e.job_title}</td>
                      <td style={{ fontWeight: 'bold' }}>{e.base_salary.toLocaleString('ar-EG')}</td>
                      <td style={{ color: 'var(--success-color)', fontWeight: 600 }}>{e.commission_rate}%</td>
                      <td><span className={`badge ${e.is_active ? 'success' : 'danger'}`}>{e.is_active ? 'نشط' : 'موقوف'}</span></td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => startEdit(e)} style={{ background: 'var(--primary-light)', border: 'none', borderRadius: '4px', padding: '0.3rem', cursor: 'pointer', color: 'var(--primary-color)' }}><Edit2 size={14} /></button>
                            {e.is_active && <button onClick={() => deleteEmp(e.id)} style={{ background: 'var(--danger-light)', border: 'none', borderRadius: '4px', padding: '0.3rem', cursor: 'pointer', color: 'var(--danger-color)' }}><Trash2 size={14} /></button>}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isAdmin && (
            <div className="glass-panel" style={{ flex: 1.5, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
              <h3 style={{ color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} /> {editId ? 'تعديل موظف' : 'تسجيل موظف جديد'}
              </h3>
              <div className="form-group" style={{ margin: 0 }}><label>الاسم الكامل</label><input className="custom-input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>المسمى الوظيفي</label><input className="custom-input" value={form.job_title} onChange={e => set('job_title', e.target.value)} /></div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>الراتب الأساسي (ج.م)</label>
                  <input type="number" className="custom-input" value={form.base_salary} onChange={e => set('base_salary', e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>عمولة المبيعات %</label>
                  <input type="number" className="custom-input" placeholder="مثال: 2.5" value={form.commission_rate} onChange={e => set('commission_rate', e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={saveEmp}>{editId ? <><CheckCircle size={16}/> حفظ التعديلات</> : <><UserPlus size={16}/> إضافة موظف</>}</button>
                {editId && <button className="btn btn-outline" onClick={() => { setEditId(null); setForm(EMPTY_EMP); }}><X size={16}/> إلغاء</button>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payroll ────────────────────────────────────────────── */}
      {tab === 'payroll' && (
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calculator size={20} color="var(--primary-color)" /> إعداد رواتب الموظفين والعمولات
            </h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <select className="custom-input" value={period} onChange={e => setPeriod(parseInt(e.target.value))}>
                {periods.map(p => <option key={p.id} value={p.id}>{p.type_period} {p.month}/{p.year}</option>)}
              </select>
              <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => {
                const data = salaries.map(s => ({
                  'الموظف': s.employee_name,
                  'الوظيفة': s.job_title,
                  'الأساسي': s.base_salary,
                  'مكافآت': s.bonus,
                  'عمولات المبيعات': s.commission,
                  'خصومات': s.deductions,
                  'عهدة': s.guarantee,
                  'الصافي': s.net_salary
                }));
                const pName = periods.find(p => p.id === period);
                exportToExcel(data, `رواتب_${pName ? pName.month + '_' + pName.year : 'الشهر'}`);
              }}>
                <FileOutput size={16} /> تصدير
              </button>
              {isAdmin && (
                <button className="btn btn-primary" onClick={runPayroll} disabled={payrollLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Download size={16} /> استحضار العمولات وإعداد الرواتب
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="custom-table" style={{ width: '100%', minWidth: '800px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                <tr>
                  <th>الموظف</th>
                  <th>الأساسي</th>
                  <th>مكافآت</th>
                  <th>عمولات المبيعات</th>
                  <th>خصومات</th>
                  <th>عهدة</th>
                  <th>الصافي</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map(s => <SalaryRow key={s.id} s={s} isAdmin={isAdmin} onUpdate={updateSalaryRow} />)}
                {salaries.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لم يتم إعداد رواتب لهذه الفترة بعد. اضغط استحضار.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
