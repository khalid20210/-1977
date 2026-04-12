import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Save, Eye, EyeOff, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function Settings() {
  const { authFetch } = useAuth();
  const [settings, setSettings] = useState({});
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok, message }
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({
    platform_name: '',
    ai_api_key: '',
    ai_model: 'gpt-4o',
    max_file_size_mb: '10',
    welcome_message: '',
  });

  const load = async () => {
    setLoading(true);
    const [sRes, mRes] = await Promise.all([
      authFetch('/api/settings'),
      authFetch('/api/settings/ai-models'),
    ]);
    if (sRes.ok) {
      const s = await sRes.json();
      setSettings(s);
      setForm(prev => ({
        platform_name: s.platform_name || '',
        ai_api_key: s.ai_api_key || '',
        ai_model: s.ai_model || 'gpt-4o',
        max_file_size_mb: s.max_file_size_mb || '10',
        welcome_message: s.welcome_message || '',
      }));
    }
    if (mRes.ok) {
      const m = await mRes.json();
      setModels(m.models || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);
    const res = await authFetch('/api/settings', { method: 'PUT', body: JSON.stringify(form) });
    const d = await res.json();
    if (!res.ok) alert(d.error || 'خطأ في الحفظ');
    else setTestResult({ ok: true, message: 'تم حفظ الإعدادات بنجاح ✅' });
    setSaving(false);
  };

  const handleTestAI = async () => {
    setTesting(true);
    setTestResult(null);
    // save key first so backend can test it
    await authFetch('/api/settings', { method: 'PUT', body: JSON.stringify({ ai_api_key: form.ai_api_key }) });
    const res = await authFetch('/api/settings/test-ai', { method: 'POST' });
    const d = await res.json();
    setTestResult({ ok: res.ok, message: d.message || d.error || 'غير معروف' });
    setTesting(false);
  };

  if (loading) return (
    <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">الإعدادات</h1>
        <p className="text-gray-500 text-sm mt-1">إعدادات المنصة والذكاء الاصطناعي</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {/* Platform Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-black text-gray-900 mb-4">إعدادات المنصة</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">اسم المنصة</label>
              <input value={form.platform_name} onChange={e => setForm({ ...form, platform_name: e.target.value })}
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="جنان بيز حلول الأعمال" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">رسالة الترحيب</label>
              <textarea value={form.welcome_message} onChange={e => setForm({ ...form, welcome_message: e.target.value })}
                rows={3} className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="اختياري — تظهر للمستخدمين بعد تسجيل الدخول" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">الحد الأقصى لحجم الملف (ميغابايت)</label>
              <input type="number" min="1" max="100" value={form.max_file_size_mb} onChange={e => setForm({ ...form, max_file_size_mb: e.target.value })}
                className="w-32 border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* AI Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-black text-gray-900 mb-1">إعدادات الذكاء الاصطناعي</h2>
          <p className="text-xs text-gray-400 mb-4">يُستخدم لتحليل الكشوفات البنكية وتقييم أهلية التمويل</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">مفتاح OpenAI API</label>
              <div className="relative flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.ai_api_key}
                  onChange={e => setForm({ ...form, ai_api_key: e.target.value })}
                  placeholder="sk-..."
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                <button type="button" onClick={() => setShowKey(v => !v)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50">
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button type="button" onClick={handleTestAI} disabled={testing || !form.ai_api_key || form.ai_api_key === '••••••••'}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 whitespace-nowrap flex items-center gap-1">
                  {testing ? <Loader size={14} className="animate-spin" /> : null} اختبار
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                احصل على المفتاح من: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">platform.openai.com</a>
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">نموذج الذكاء الاصطناعي</label>
              <div className="space-y-2">
                {models.map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.ai_model === m.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="ai_model" value={m.id} checked={form.ai_model === m.id} onChange={() => setForm({ ...form, ai_model: m.id })} className="accent-blue-600" />
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${testResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {testResult.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {testResult.message}
          </div>
        )}

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
          {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          حفظ الإعدادات
        </button>
      </form>
    </div>
  );
}
