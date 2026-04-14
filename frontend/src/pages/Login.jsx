import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, BarChart2, FileText, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

const features = [
  { title: 'تحليل أهليتك للتسهيلات التمويلية', desc: 'تحليل ذكي لبيانات المنشآت والكشوفات', Icon: BarChart2 },
  { title: 'إدارة المستندات', desc: 'رفع وتنظيم ملفات المنشأة والعقود', Icon: FileText },
  { title: 'متابعة شاملة', desc: 'متابعة الطلبات والشركاء والوسطاء', Icon: Users },
];

export default function Login() {
  const [form, setForm] = React.useState({ email: '', password: '' });
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: 'الخادم أعاد استجابة غير متوقعة' };
      }

      if (!res.ok) throw new Error(data.message || 'بيانات الدخول غير صحيحة');
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'حدث خطأ، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden" dir="rtl" style={{ maxHeight: '100vh' }}>

      {/* ============ اليمين - الجانب الأزرق ============ */}
      <div
        className="hidden lg:flex lg:w-[60%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(155deg, #0d1b35 0%, #1e3a8a 55%, #0d1b35 100%)' }}
      >
        {/* شعار */}
        <div className="flex justify-start">
          <div>
            <img src="/logo.svg" alt="Jenan BIZ" className="h-20 w-auto object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.18)]" />
            <div className="text-blue-200 text-xs mt-3 opacity-70">منصة متكاملة • تحليل وإدارة الاستشارات الإدارية</div>
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="z-10 flex-1 flex flex-col justify-start pt-6">
          <h1 className="text-white font-black leading-tight mb-2" style={{ fontSize: '2.8rem' }}>
            حلول الأعمال<br />
            <span className="text-blue-400">المتكاملة</span>
          </h1>
          <p className="text-blue-200 text-base mb-4 leading-relaxed max-w-lg">
            تحليل وإدارة الاستشارات الإدارية، وتأهيل وإعادة هيكلة المنشآت باحترافية عالية.
          </p>
          <div className="space-y-1">
            {features.map((f, i) => (
              <div
                key={i}
                className="group relative flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300"
                style={{
                  marginRight: `${i * 18}px`,
                  userSelect: 'none',
                  border: '1px solid transparent',
                  backdropFilter: 'blur(6px)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(14,165,233,0.18) 0%, rgba(56,189,248,0.08) 100%)';
                  e.currentTarget.style.border = '1px solid rgba(56,189,248,0.35)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(14,165,233,0.2), inset 0 0 20px rgba(56,189,248,0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.border = '1px solid transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* الأيقونة */}
                <div
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: 'rgba(14,165,233,0.12)',
                    border: '1px solid rgba(14,165,233,0.3)',
                    boxShadow: '0 0 0 transparent',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 12px rgba(14,165,233,0.5)'}
                >
                  <f.Icon size={18} className="text-sky-300 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* النص */}
                <div className="flex-1 text-right">
                  <div className="text-white font-bold text-sm leading-tight group-hover:text-sky-200 transition-colors duration-300">{f.title}</div>
                  <div className="text-blue-400 text-xs mt-0.5 opacity-80 group-hover:text-sky-300 group-hover:opacity-100 transition-all duration-300">{f.desc}</div>
                </div>

                {/* خط توهج يساري */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full transition-all duration-300 group-hover:h-3/4"
                  style={{ height: '0%', background: 'linear-gradient(180deg, transparent, #38bdf8, transparent)' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* الفوتر */}
        <div className="absolute bottom-4 left-0 right-0 text-blue-200 text-xs text-center opacity-50">
          © Jenan BIZ 2026 — جميع الحقوق محفوظة
        </div>
      </div>

      {/* ============ اليسار - الجانب الأبيض ============ */}
      <div className="flex flex-1 lg:w-[40%] items-center justify-center overflow-hidden"
        style={{ background: '#ffffff' }}>
        <div className="w-full max-w-sm px-8">

          <p className="text-center text-blue-600 text-xs font-bold tracking-widest mb-2">WELCOME BACK</p>
          <h2 className="text-3xl font-black text-gray-900 mb-1 text-center">تسجيل الدخول</h2>
          <p className="text-center text-gray-400 text-sm mb-8">أدخل بياناتك للوصول إلى المنصة</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* البريد */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-3 pr-10 pl-4 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <Lock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-3 pr-10 pl-10 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* تذكرني */}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="w-4 h-4 accent-blue-600" />
              <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">تذكرني</label>
            </div>

            {/* زر الدخول */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
              style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>دخول</span>
                  <ArrowLeft size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">سجل الآن</Link>
          </p>
        </div>
      </div>

    </div>
  );
}