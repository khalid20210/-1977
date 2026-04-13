import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, X, Store, Phone, User, Building2, Trash2, Calendar } from 'lucide-react';

const ENTITY_TYPES = ['شركة', 'مؤسسة', 'محل تجاري', 'مقاول', 'مزرعة', 'أخرى'];

const typeColors = {
  'شركة': 'bg-blue-100 text-blue-700',
  'مؤسسة': 'bg-purple-100 text-purple-700',
  'محل تجاري': 'bg-amber-100 text-amber-700',
  'مقاول': 'bg-orange-100 text-orange-700',
  'مزرعة': 'bg-green-100 text-green-700',
  'أخرى': 'bg-gray-100 text-gray-600',
};

export default function Establishments() {
  const { authFetch, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ company_name: '', owner_name: '', owner_phone: '', entity_type: 'شركة' });
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/establishments/establishments' + (search ? `?search=${encodeURIComponent(search)}` : ''));
      const data = res.ok ? await res.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } catch (_) { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const openModal = () => {
    setForm({ company_name: '', owner_name: '', owner_phone: '', entity_type: 'شركة' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) { setError('اسم المنشأة مطلوب'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await authFetch('/api/establishments/establishments', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'حدث خطأ'); }
      else { setShowModal(false); load(); }
    } catch (_) { setError('حدث خطأ في الاتصال'); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('هل تريد حذف هذه المنشأة؟')) return;
    try {
      const res = await authFetch(`/api/establishments/establishments/${id}`, { method: 'DELETE' });
      if (res.ok) { setItems(prev => prev.filter(x => x.id !== id)); }
      else { const d = await res.json(); alert(d.error || 'خطأ في الحذف'); }
    } catch (_) { alert('حدث خطأ'); }
  };

  const filtered = search
    ? items.filter(i =>
        i.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        i.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
        i.owner_phone?.includes(search)
      )
    : items;

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">منشآتي</h1>
          <p className="text-gray-500 text-sm mt-1">
            {items.length} منشأة مسجلة
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all shadow-md"
          style={{ background: 'linear-gradient(135deg, #0d1b35, #2563eb)' }}
        >
          <Plus size={16} />
          إضافة منشأة
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative mb-5">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث باسم المنشأة أو المالك أو الجوال..."
          className="w-full border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button type="button" onClick={() => { setSearch(''); load(); }} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </form>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {ENTITY_TYPES.slice(0, 4).map(t => {
          const count = items.filter(i => i.entity_type === t).length;
          return (
            <div key={t} className={`rounded-xl p-3 text-center ${typeColors[t] || 'bg-gray-100 text-gray-600'}`}>
              <p className="text-2xl font-black">{count}</p>
              <p className="text-xs font-medium mt-0.5">{t}</p>
            </div>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Store size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">لا توجد منشآت مسجلة بعد</p>
          <p className="text-sm mt-1">أضف منشأة جديدة للبدء</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-lg shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)' }}
                >
                  {item.company_name?.[0]?.toUpperCase() || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">{item.company_name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${typeColors[item.entity_type] || 'bg-gray-100 text-gray-600'}`}>
                      {item.entity_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    {item.owner_name && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <User size={11} />
                        {item.owner_name}
                      </span>
                    )}
                    {item.owner_phone && (
                      <a
                        href={`tel:${item.owner_phone}`}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        <Phone size={11} />
                        {item.owner_phone}
                      </a>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={11} />
                      {new Date(item.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {item.added_by_name && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      أضافها: {item.added_by_name} ({item.added_by_role === 'employee' ? 'موظف' : 'شريك'})
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.owner_phone && (
                    <a
                      href={`https://wa.me/966${item.owner_phone.replace(/^0/, '').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      title="واتساب"
                      onClick={e => e.stopPropagation()}
                    >
                      <Phone size={14} />
                    </a>
                  )}
                  {(user?.role === 'admin' || item.user_id === user?.id) && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" dir="rtl">
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
              style={{ background: 'linear-gradient(135deg, #0d1b35, #1e3a8a)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Building2 size={18} className="text-white" />
                </div>
                <h2 className="text-white font-bold text-base">إضافة منشأة جديدة</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  اسم المنشأة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="أدخل اسم المنشأة..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع المنشأة</label>
                <select
                  value={form.entity_type}
                  onChange={e => setForm(f => ({ ...f, entity_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">اسم المالك</label>
                <input
                  type="text"
                  value={form.owner_name}
                  onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                  placeholder="اسم صاحب المنشأة..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">رقم الجوال</label>
                <input
                  type="tel"
                  value={form.owner_phone}
                  onChange={e => setForm(f => ({ ...f, owner_phone: e.target.value }))}
                  placeholder="05xxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
              </div>

              {/* Added by (auto) */}
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-2">
                <User size={14} className="text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  ستُحفظ هذه المنشأة باسمك تلقائياً: <span className="font-bold">{user?.name}</span>
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
                  style={{ background: 'linear-gradient(135deg, #0d1b35, #2563eb)' }}
                >
                  {submitting ? 'جارٍ الحفظ...' : 'حفظ المنشأة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
