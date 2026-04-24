import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, X, Store, Phone, User, Building2, Trash2, Calendar, Eye, Edit2 } from 'lucide-react';

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
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ company_name: '', owner_name: '', owner_phone: '', entity_type: 'شركة' });
  const [error, setError] = useState('');

  const load = async (query = search) => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/companies' + (query ? `?search=${encodeURIComponent(query)}` : ''));
      const data = res.ok ? await res.json() : [];
      setItems(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (_) {
      setItems([]);
      setSelectedIds([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load('');
  }, []);

  const resetForm = () => {
    setForm({ company_name: '', owner_name: '', owner_phone: '', entity_type: 'شركة' });
    setSelectedItem(null);
    setError('');
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item) => {
    setSelectedItem(item);
    setForm({
      company_name: item.company_name || '',
      owner_name: item.owner_name || '',
      owner_phone: item.owner_phone || '',
      entity_type: item.entity_type || 'شركة',
    });
    setError('');
    setShowModal(true);
  };

  const openDetails = (item) => {
    setSelectedItem(item);
    setShowDetails(true);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    load(search);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) {
      setError('اسم المنشأة مطلوب');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const url = selectedItem ? `/api/admin/companies/${selectedItem.id}` : '/api/admin/companies';
      const method = selectedItem ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حدث خطأ');
      } else {
        setShowModal(false);
        await load();
      }
    } catch (_) {
      setError('حدث خطأ في الاتصال');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('هل تريد حذف هذه المنشأة؟')) return;
    try {
      const res = await authFetch(`/api/admin/companies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'خطأ في الحذف');
      }
    } catch (_) {
      alert('حدث خطأ في الحذف');
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
  };

  const filtered = search
    ? items.filter(item =>
        item.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.owner_phone?.includes(search)
      )
    : items;

  const visibleSelectableIds = filtered.map(item => item.id);
  const allVisibleSelected = visibleSelectableIds.length > 0 && visibleSelectableIds.every(id => selectedIds.includes(id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleSelectableIds.includes(id)));
      return;
    }
    setSelectedIds(prev => Array.from(new Set([...prev, ...visibleSelectableIds])));
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل تريد حذف ${selectedIds.length} منشأة؟`)) return;
    try {
      const res = await authFetch('/api/admin/companies/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطأ في الحذف الجماعي');
        return;
      }
      await load();
    } catch (_) {
      alert('حدث خطأ في الحذف الجماعي');
    }
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">المنشآت</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} منشأة مسجلة</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all shadow-md"
          style={{ background: 'linear-gradient(135deg, #0d1b35, #2563eb)' }}
        >
          <Plus size={16} />
          إضافة منشأة
        </button>
      </div>

      <form onSubmit={handleSearch} className="relative mb-5">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث باسم المنشأة أو المالك أو الجوال..."
          className="w-full border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button type="button" onClick={() => { setSearch(''); load(''); }} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </form>

      {visibleSelectableIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {allVisibleSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{selectedIds.length} محدد</span>
            <button
              onClick={bulkDelete}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={15} /> حذف المحدد
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {ENTITY_TYPES.slice(0, 4).map(type => {
          const count = items.filter(item => item.entity_type === type).length;
          return (
            <div key={type} className={`rounded-xl p-3 text-center ${typeColors[type] || 'bg-gray-100 text-gray-600'}`}>
              <p className="text-2xl font-black">{count}</p>
              <p className="text-xs font-medium mt-0.5">{type}</p>
            </div>
          );
        })}
      </div>

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
            {filtered.map(item => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelection(item.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-lg shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)' }}
                >
                  {item.company_name?.[0]?.toUpperCase() || '?'}
                </div>

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
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    أضافها: {item.employee_name || item.added_by_name || '—'}
                    {item.funding_entity_name ? ` - الجهة: ${item.funding_entity_name}` : ''}
                    {item.request_status ? ` - الحالة: ${item.request_status}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openDetails(item)}
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title="التفاصيل"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                    title="تعديل"
                  >
                    <Edit2 size={14} />
                  </button>
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
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #0d1b35, #1e3a8a)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Building2 size={18} className="text-white" />
                </div>
                <h2 className="text-white font-bold text-base">{selectedItem ? 'تعديل المنشأة' : 'إضافة منشأة جديدة'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">اسم المنشأة <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={e => setForm(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع المنشأة</label>
                <select
                  value={form.entity_type}
                  onChange={e => setForm(prev => ({ ...prev, entity_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ENTITY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">اسم المالك</label>
                <input
                  type="text"
                  value={form.owner_name}
                  onChange={e => setForm(prev => ({ ...prev, owner_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">رقم الجوال</label>
                <input
                  type="tel"
                  value={form.owner_phone}
                  onChange={e => setForm(prev => ({ ...prev, owner_phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
              </div>

              <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700">
                يستطيع المدير من هنا مراجعة بيانات المنشأة وتعديلها أو حذفها وربطها بالطلبات الحالية.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
                  style={{ background: 'linear-gradient(135deg, #0d1b35, #2563eb)' }}
                >
                  {submitting ? 'جارٍ الحفظ...' : selectedItem ? 'حفظ التعديلات' : 'حفظ المنشأة'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetails && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #0d1b35, #1e3a8a)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Store size={18} className="text-white" />
                </div>
                <h2 className="text-white font-bold text-base">تفاصيل المنشأة</h2>
              </div>
              <button onClick={() => setShowDetails(false)} className="text-white/70 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-gray-50 p-4"><div className="text-gray-400 text-xs mb-1">اسم المنشأة</div><div className="font-bold text-gray-900">{selectedItem.company_name || '—'}</div></div>
              <div className="rounded-xl bg-gray-50 p-4"><div className="text-gray-400 text-xs mb-1">نوع المنشأة</div><div className="font-bold text-gray-900">{selectedItem.entity_type || '—'}</div></div>
              <div className="rounded-xl bg-gray-50 p-4"><div className="text-gray-400 text-xs mb-1">اسم المالك</div><div className="font-bold text-gray-900">{selectedItem.owner_name || '—'}</div></div>
              <div className="rounded-xl bg-gray-50 p-4"><div className="text-gray-400 text-xs mb-1">الجوال</div><div className="font-bold text-gray-900">{selectedItem.owner_phone || '—'}</div></div>
              <div className="rounded-xl bg-gray-50 p-4"><div className="text-gray-400 text-xs mb-1">أضافها</div><div className="font-bold text-gray-900">{selectedItem.employee_name || selectedItem.added_by_name || '—'}</div></div>
              <div className="rounded-xl bg-gray-50 p-4"><div className="text-gray-400 text-xs mb-1">الجهة التمويلية</div><div className="font-bold text-gray-900">{selectedItem.funding_entity_name || '—'}</div></div>
              <div className="rounded-xl bg-gray-50 p-4"><div className="text-gray-400 text-xs mb-1">حالة الطلب</div><div className="font-bold text-gray-900">{selectedItem.request_status || '—'}</div></div>
              <div className="rounded-xl bg-gray-50 p-4"><div className="text-gray-400 text-xs mb-1">التاريخ</div><div className="font-bold text-gray-900">{selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString('ar-SA') : '—'}</div></div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { setShowDetails(false); openEdit(selectedItem); }} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-all inline-flex items-center justify-center gap-2">
                <Edit2 size={15} />
                تعديل
              </button>
              <button onClick={() => setShowDetails(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}