import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState('request');
  const [resetToken, setResetToken] = React.useState('');
  const [form, setForm] = React.useState({
    email: '',
    code: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const updateField = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleRequestCode = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!form.email.trim()) {
      setError('أدخل البريد الإلكتروني أولاً');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_BASE + '/api/auth/forgot-password/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
        }),
      });

      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: 'تعذر قراءة استجابة الخادم' };
      }

      if (!response.ok) {
        setError(data.error || 'تعذر إرسال الرمز');
        return;
      }

      setSuccess(data.message || 'تم إرسال رمز التحقق إلى البريد الإلكتروني');
      setStep('verify');
      setResetToken('');
    } catch (_) {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!form.email.trim() || !form.code.trim()) {
      setError('أكمل الحقول المطلوبة أولاً');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_BASE + '/api/auth/forgot-password/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          code: form.code.trim(),
          password: form.password,
        }),
      });

      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: 'تعذر قراءة استجابة الخادم' };
      }

      if (!response.ok) {
        setError(data.error || 'تعذر تحديث كلمة المرور');
        return;
      }

      setSuccess(data.message || 'تم التحقق من الرمز بنجاح');
      setResetToken(data.resetToken || '');
      setStep('reset');
    } catch (_) {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!resetToken || !form.password || !form.confirmPassword) {
      setError('أكمل الحقول المطلوبة أولاً');
      return;
    }

    if (form.password.length < 8) {
      setError('كلمة المرور يجب أن لا تقل عن 8 أحرف');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_BASE + '/api/auth/forgot-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, password: form.password }),
      });

      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: 'تعذر قراءة استجابة الخادم' };
      }

      if (!response.ok) {
        setError(data.error || 'تعذر تحديث كلمة المرور');
        return;
      }

      setSuccess(data.message || 'تم تحديث كلمة المرور بنجاح');
      setResetToken('');
      setForm({ email: '', code: '', password: '', confirmPassword: '' });
      setStep('request');
      window.setTimeout(() => navigate('/login'), 1800);
    } catch (_) {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async (event) => {
    await handleRequestCode(event);
  };

  return (
    <div className="min-h-screen flex overflow-hidden" dir="rtl">
      <div
        className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(155deg, #0d1b35 0%, #1e3a8a 55%, #0d1b35 100%)' }}
      >
        <div className="flex justify-start">
          <div>
            <img src="/logo-dark-bg.svg" alt="Jenan BIZ" className="h-20 w-auto object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.18)]" />
            <div className="text-blue-200 text-xs mt-3 opacity-70">استعادة الوصول للحساب بخطوات بسيطة وآمنة</div>
          </div>
        </div>

        <div className="z-10 flex-1 flex flex-col justify-center">
          <h1 className="text-white font-black leading-tight mb-4" style={{ fontSize: '2.6rem' }}>
            نسيت كلمة السر؟
          </h1>
          <p className="text-blue-200 text-base leading-8 max-w-lg">
            أدخل البريد الإلكتروني المسجل في حسابك، وسنرسل لك رمز تحقق عشوائي من 4 أرقام إلى البريد الإلكتروني.
          </p>
          <div className="mt-8 space-y-3 max-w-xl">
            {[
              'يتم إرسال رمز عشوائي من 4 أرقام إلى البريد الإلكتروني المسجل.',
              'صلاحية الرمز 10 دقائق فقط مع عدد محاولات محدود.',
              'إذا كان البريد غير صحيح أو الحساب محظوراً فلن يكتمل الاسترجاع.'
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-sky-400/20 bg-white/5 px-4 py-3 text-sm text-blue-100 backdrop-blur-sm">
                <ShieldCheck size={18} className="text-sky-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-4 left-0 right-0 text-blue-200 text-xs text-center opacity-50">
          © Jenan BIZ 2026 — جميع الحقوق محفوظة
        </div>
      </div>

      <div className="flex flex-1 lg:w-[42%] items-center justify-center p-8 overflow-y-auto bg-white">
        <div className="w-full max-w-sm">
          <p className="text-center text-blue-600 text-xs font-bold tracking-widest mb-2">RESET PASSWORD</p>
          <h2 className="text-3xl font-black text-gray-900 mb-1 text-center">{step === 'request' ? 'إرسال رمز التحقق' : step === 'verify' ? 'التحقق من الرمز' : 'تعيين كلمة مرور جديدة'}</h2>
          <p className="text-center text-gray-400 text-sm mb-8">
            {step === 'request' ? 'استخدم البريد المسجل في الحساب' : step === 'verify' ? 'أدخل الرمز المرسل إلى بريدك' : 'تم التحقق بنجاح، أدخل كلمة المرور الجديدة'}
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-green-700 bg-green-50 border border-green-100">
              {success}
            </div>
          )}

          <form onSubmit={step === 'request' ? handleRequestCode : step === 'verify' ? handleVerifyCode : handleResetPassword} className="space-y-5">
            {step !== 'reset' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="example@email.com"
                    value={form.email}
                    onChange={updateField('email')}
                    className="w-full border border-gray-200 rounded-xl py-3 pr-10 pl-4 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            {step === 'verify' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">رمز التحقق</label>
                  <div className="relative">
                    <ShieldCheck size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{4}"
                      maxLength={4}
                      required
                      placeholder="0000"
                      value={form.code}
                      onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, '').slice(0, 4);
                        setForm((current) => ({ ...current, code: value }));
                      }}
                      className="w-full border border-gray-200 rounded-xl py-3 pr-10 pl-4 text-sm tracking-[0.4em] text-center bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-400">الرمز مكون من 4 أرقام وصلاحيته 10 دقائق.</div>
                </div>

                <div className="text-left -mt-2">
                  <button
                    type="button"
                    onClick={resendCode}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    إعادة إرسال الرمز
                  </button>
                </div>
              </>
            )}

            {step === 'reset' && (
              <>
                <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                  تم التحقق من الرمز بنجاح. يمكنك الآن تعيين كلمة المرور الجديدة.
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <Lock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={form.password}
                      onChange={updateField('password')}
                      className="w-full border border-gray-200 rounded-xl py-3 pr-10 pl-10 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">تأكيد كلمة المرور الجديدة</label>
                  <div className="relative">
                    <Lock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={updateField('confirmPassword')}
                      className="w-full border border-gray-200 rounded-xl py-3 pr-10 pl-10 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </>
            )}

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
                  <span>{step === 'request' ? 'إرسال الرمز' : step === 'verify' ? 'تحقق من الرمز' : 'تحديث كلمة المرور'}</span>
                  <ArrowLeft size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            تذكرت كلمة المرور؟{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">العودة لتسجيل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  );
}