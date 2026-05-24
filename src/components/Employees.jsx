import React, { useEffect, useState } from 'react';
import { Users, UserPlus, FileSpreadsheet, Calculator, Edit2, Trash2, CheckCircle, PlusCircle, X } from 'lucide-react';
import { api } from '../api.js';

const EMPTY_EMP = { name: '', job_title: '', base_salary: '' };

export default function Employees({ user }) {
  const isAdmin = user?.level === 3;
  const [tab, setTab] = useState('list'); // 'list', 'payroll'
  
  // Employees State
  const [employees, setEmployees] = useState([]);
  const [form, setForm]           = useState(EMPTY_EMP);
  const [editId, setEditId]       = useState(null);
  
  // Payroll State
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
      if (editId) {
        await api.updateEmployee(editId, { ...form, base_salary: +form.base_salary }, user.id);
      } else {
        await api.createEmployee({ ...form, base_salary: +form.base_salary });
      }
      setForm(EMPTY_EMP); setEditId(null); load();
    } catch (e) { alert(e.message); }
  }

  async function deleteEmp(id) {
    if(!window.confirm('إيقاف تفعيل الموظف؟ (لن يظهر في كشف الرواتب القادم)')) return;
    try {
      await api.deleteEmployee(id, user.id);
      load();
    } catch(e) { alert(e.message); }
  }

  function startEdit(e) {
    setEditId(e.id);
    setForm({ name: e.name, job_title: e.job_title, base_salary: e.base_salary });
  }

  async function runPayroll() {
    setPayrollLoading(true);
    try {
      await api.runPayroll(period);
      loadSalaries(period);
    } catch (e) { alert(e.message); }
    finally { setPayrollLoading(false); }
  }

  async function updateSalaryRow(sid, field, value) {
    try {
      await api.updateSalary(sid, { [field]: +value }, user.id);
      loadSalaries(period);
    } catch (e) { alert(e.message); }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Tabs */}
      <div className="glass-panel" style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem' }}>
        {[
          { id: 'list', label: 'دليل الموظفين', icon: Users },
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

      {tab === 'list' && (
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
          {/* Employee List */}
          <div className="glass-panel" style={{ flex: 2, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: 'var(--secondary-color)', marginBottom: '1.5rem' }}>بيانات الموظفين</h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr><th>الرقم</th><th>الاسم</th><th>الوظيفة</th><th>الراتب الأساسي</th><th>الحالة</th>{isAdmin && <th>إجراءات</th>}</tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id}>
                      <td>{e.id}</td><td style={{ fontWeight: 600 }}>{e.name}</td><td>{e.job_title}</td>
                      <td style={{ fontWeight: 'bold' }}>{e.base_salary.toLocaleString('ar-EG')}</td>
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

          {/* Edit/Add Form */}
          {isAdmin && (
            <div className="glass-panel" style={{ flex: 1, padding: '1.5rem' }}>
              <h3 style={{ color: 'var(--secondary-color)', marginBottom: '1.5rem' }}>{editId ? 'تعديل موظف' : 'تسجيل موظف جديد'}</h3>
              <div className="form-group"><label>الاسم الكامل</label><input className="custom-input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div className="form-group"><label>المسمى الوظيفي</label><input className="custom-input" value={form.job_title} onChange={e => set('job_title', e.target.value)} /></div>
              <div className="form-group"><label>الراتب الأساسي (ج.م)</label><input type="number" className="custom-input" value={form.base_salary} onChange={e => set('base_salary', e.target.value)} /></div>
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={saveEmp}>{editId ? <><CheckCircle size={16}/> حفظ التعديلات</> : <><UserPlus size={16}/> إضافة موظف</>}</button>
                {editId && <button className="btn btn-outline" onClick={() => { setEditId(null); setForm(EMPTY_EMP); }}><X size={16}/> إلغاء</button>}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'payroll' && (
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calculator size={20} color="var(--primary-color)" /> إعداد رواتب الموظفين
            </h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <select className="custom-input" value={period} onChange={e => setPeriod(parseInt(e.target.value))}>
                {periods.map(p => <option key={p.id} value={p.id}>{p.type_period} {p.month}/{p.year}</option>)}
              </select>
              {isAdmin && (
                <button className="btn btn-primary" onClick={runPayroll} disabled={payrollLoading}>
                  <Calculator size={16} /> استحضار موظفين الفترة
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="custom-table">
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                <tr>
                  <th>الموظف</th>
                  <th>الراتب الأساسي</th>
                  <th>مكافآت / بدلات</th>
                  <th>عمولات تذاكر</th>
                  <th>خصومات / سلف</th>
                  <th>عهدة / كفالة</th>
                  <th>الصافي للاستلام</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.employee_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.job_title}</div>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{s.base_salary.toLocaleString('ar-EG')}</td>
                    <td>
                      <input type="number" className="custom-input" style={{ width: '100px', textAlign: 'center', padding: '0.2rem', color: 'var(--success-color)' }}
                        value={s.bonus} onBlur={e => isAdmin && updateSalaryRow(s.id, 'bonus', e.target.value)} onChange={() => {}} disabled={!isAdmin} />
                    </td>
                    <td>
                      <input type="number" className="custom-input" style={{ width: '100px', textAlign: 'center', padding: '0.2rem', color: 'var(--success-color)' }}
                        value={s.commission} onBlur={e => isAdmin && updateSalaryRow(s.id, 'commission', e.target.value)} onChange={() => {}} disabled={!isAdmin} />
                    </td>
                    <td>
                      <input type="number" className="custom-input" style={{ width: '100px', textAlign: 'center', padding: '0.2rem', color: 'var(--danger-color)' }}
                        value={s.deductions} onBlur={e => isAdmin && updateSalaryRow(s.id, 'deductions', e.target.value)} onChange={() => {}} disabled={!isAdmin} />
                    </td>
                    <td>
                      <input type="number" className="custom-input" style={{ width: '100px', textAlign: 'center', padding: '0.2rem', color: 'var(--warning-color)' }}
                        value={s.guarantee} onBlur={e => isAdmin && updateSalaryRow(s.id, 'guarantee', e.target.value)} onChange={() => {}} disabled={!isAdmin} />
                    </td>
                    <td style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary-color)' }}>
                      {s.net_salary.toLocaleString('ar-EG')} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
