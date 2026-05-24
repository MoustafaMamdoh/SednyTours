import React, { useState } from 'react';
import { Plane, Lock, User, LogIn, AlertCircle } from 'lucide-react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await api.login(form);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative background elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'var(--primary-light)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.5 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw', background: 'rgba(56, 189, 248, 0.2)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.5 }}></div>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '3rem 2rem', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px -5px var(--primary-light)' }}>
            <Plane size={40} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ color: 'var(--secondary-color)', fontSize: '1.8rem', margin: '0.5rem 0' }}>سيدني تورز</h1>
            <p style={{ color: 'var(--text-secondary)' }}>نظام الإدارة المحاسبية المتكامل</p>
          </div>
        </div>

        {error && (
          <div style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', color: 'var(--danger-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>اسم المستخدم</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" required className="custom-input" style={{ paddingRight: '2.8rem' }} placeholder="أدخل اسم المستخدم"
                value={form.username} onChange={e => set('username', e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="password" required className="custom-input" style={{ paddingRight: '2.8rem' }} placeholder="أدخل كلمة المرور"
                value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', marginTop: '1rem', fontSize: '1.05rem' }} disabled={loading}>
            <LogIn size={20} /> {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
          سيدني تورز © {new Date().getFullYear()} — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
