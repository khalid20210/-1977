import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, BarChart2, FileText, Users } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const features = [
  { title: 'تحليل أهليتك للتسهيلات التمويلية', desc: 'تحليل ذكي لبيانات المنشآت والكشوفات', Icon: BarChart2 },
  { title: 'إدارة المستندات', desc: 'رفع وتنظيم ملفات المنشأة والعقود', Icon: FileText },
  { title: 'متابعة شاملة', desc: 'متابعة الطلبات والشركاء والوسطاء', Icon: Users },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    role: 'employee',
    partner_type: '',
    password: '',
    confirmPassword: '',
  });
  const [showPass, setShowPass] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const updateField = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
      setError('أكمل الحقول المطلوبة أولاً');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (form.password.length < 8) {
      setError('كلمة المرور يجب أن لا تقل عن 8 أحرف');
      return;
    }
    if (form.role === 'partner' && !form.partner_type.trim()) {
      setError('حدد نوع الشراكة');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(API_BASE + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          role: form.role,
          partner_type: form.role === 'partner' ? form.partner_type.trim() : null,
          password: form.password,
        }),
      });

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { error: 'تعذر قراءة استجابة الخادم' }; }

      if (!res.ok) {
        setError(data.error || 'تعذر إنشاء الحساب');
        return;
      }

      setSuccess(data.message || 'تم إرسال طلب التسجيل للإدارة');
      setForm({ name: '', email: '', phone: '', role: 'employee', partner_type: '', password: '', confirmPassword: '' });
      window.setTimeout(() => navigate('/login'), 1800);
    } catch (submitError) {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden" dir="rtl">
      {/* اللوحة اليمنى - المعلومات */}
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
          <div>
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
                  style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)' }}
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
        </div>

        {/* الفوتر */}
        <div className="absolute bottom-4 left-0 right-0 text-blue-200 text-xs text-center opacity-50">
          © Jenan BIZ 2026 — جميع الحقوق محفوظة
        </div>
      </div>

      {/* اللوحة اليسرى - النموذج */}
      <div className="flex flex-1 lg:w-[40%] items-center justify-center p-8 overflow-y-auto" style={{ background: '#ffffff' }}>
        <div className="w-full max-w-sm">
          <p className="text-center text-blue-600 text-xs font-bold tracking-widest mb-2">CREATE ACCOUNT</p>
          <h2 className="text-3xl font-black text-gray-900 mb-1 text-center">إنشاء حساب جديد</h2>
          <p className="text-center text-gray-400 text-sm mb-8">أنشئ حسابك وسيصل طلبك للمدير للموافقة أو الرفض</p>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">الاسم الكامل</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 flex">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl py-3 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="اسمك الكامل"
                  value={form.name}
                  onChange={updateField('name')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 flex">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-xl py-3 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={updateField('email')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">رقم الجوال</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                placeholder="05xxxxxxxx"
                value={form.phone}
                onChange={updateField('phone')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع الحساب</label>
              <select
                className="w-full border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                value={form.role}
                onChange={updateField('role')}
              >
                <option value="employee">موظف</option>
                <option value="partner">شريك / وسيط</option>
              </select>
            </div>
            {form.role === 'partner' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع الشراكة</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="مثال: وسيط"
                  value={form.partner_type}
                  onChange={updateField('partner_type')}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 flex">
                  <Lock size={16} />
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full border border-gray-200 rounded-xl py-3 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={updateField('password')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">تأكيد كلمة المرور</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 flex">
                  <Lock size={16} />
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full border border-gray-200 rounded-xl py-3 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={updateField('confirmPassword')}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-500 select-none cursor-pointer">
              <input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} />
              إظهار كلمة المرور
            </label>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}
            {success && <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">{success}</div>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full text-white font-bold py-3 rounded-xl text-base transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}
            >
              {submitting ? 'جارٍ إرسال الطلب...' : 'إنشاء الحساب ←'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-6">
            لديك حساب؟{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">تسجيل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  );
}