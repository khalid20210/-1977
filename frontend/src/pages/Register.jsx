import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, BarChart2, FileText, Users } from 'lucide-react';

const features = [
  { title: 'تحليل أهليتك للتسهيلات التمويلية', desc: 'تحليل ذكي لبيانات المنشآت والكشوفات', Icon: BarChart2 },
  { title: 'إدارة المستندات', desc: 'رفع وتنظيم ملفات المنشأة والعقود', Icon: FileText },
  { title: 'متابعة شاملة', desc: 'متابعة الطلبات والشركاء والوسطاء', Icon: Users },
];

export default function Register() {
  const [form, setForm] = React.useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = React.useState(false);

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
            <div className="flex items-end gap-0" style={{ lineHeight: 1 }}>
              <span className="text-white font-black" style={{ fontSize: '2.6rem', fontFamily: 'Georgia, serif' }}>J</span>
              <span className="text-white font-light" style={{ fontSize: '1.5rem', letterSpacing: '0.05em', marginBottom: '4px' }}>enan</span>
            </div>
            <div className="text-blue-300 font-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.5em', marginTop: '-2px' }}>BIZ</div>
            <div className="text-blue-200 text-xs mt-1 opacity-70">منصة متكاملة • تحليل وإدارة الاستشارات الإدارية</div>
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
          <p className="text-center text-gray-400 text-sm mb-8">أنشئ حسابك للبدء باستخدام المنصة</p>
          <form className="space-y-5">
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
                  onChange={e => setForm({ ...form, name: e.target.value })}
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
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
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
                  onChange={e => setForm({ ...form, password: e.target.value })}
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
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full text-white font-bold py-3 rounded-xl text-base transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}
            >
              إنشاء الحساب ←
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