import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Search, X, Phone, Edit2 } from 'lucide-react';

export default function Brokers() {
  const { authFetch, user } = useAuth();
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  // Edit
  const [editBroker, setEditBroker] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '' });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const openEdit = (b) => {
    setEditBroker(b);
    setEditForm({ name: b.name || '', phone: b.phone || '', notes: b.notes || '' });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmittingEdit(true);
    const res = await authFetch(`/api/brokers/${editBroker.id}`, { method: 'PUT', body: JSON.stringify(editForm) });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'خطأ'); else { setEditBroker(null); load(); }
    setSubmittingEdit(false);
  };

  const load = async () => {
    setLoading(true);
    const res = await authFetch('/api/brokers');
    const data = res.ok ? await res.json() : [];
    setBrokers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await authFetch('/api/brokers', { method: 'POST', body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'خطأ'); } else { setShowNew(false); setForm({ name: '', phone: '', notes: '' }); load(); }
    setSubmitting(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`حذف الوسيط "${name}"؟`)) return;
    const res = await authFetch(`/api/brokers/${id}`, { method: 'DELETE' });
    if (res.ok) load(); else { const d = await res.json(); alert(d.error || 'خطأ'); }
  };

  const filtered = brokers.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.phone?.includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">الوسطاء</h1>
          <p className="text-gray-500 text-sm mt-1">{brokers.length} وسيط</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90"
          style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
          <Plus size={16} /> إضافة وسيط
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم الوسيط أو الجوال..."
          className="w-full border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">لا يوجد وسطاء</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(b => (
                <div key={b.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-700 font-bold text-sm">{b.name?.[0] || '؟'}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{b.name}</div>
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <Phone size={11} /> {b.phone}
                      </div>
                      {b.notes && <div className="text-gray-400 text-xs mt-0.5">{b.notes}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">أضافه: {b.added_by_name}</span>
                    {(user?.role === 'admin' || b.added_by_id === user?.id) && (
                      <button onClick={() => openEdit(b)}
                        className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors">
                        <Edit2 size={14} />
                      </button>
                    )}
                    {(user?.role === 'admin' || b.added_by_id === user?.id) && (
                      <button onClick={() => handleDelete(b.id, b.name)}
                        className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">تعديل بيانات الوسيط</h2>
              <button onClick={() => setEditBroker(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الوسيط *</label>
                <input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">رقم الجوال *</label>
                <input required value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ملاحظات</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3} className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submittingEdit}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #92400e, #d97706)' }}>
                  {submittingEdit ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button type="button" onClick={() => setEditBroker(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">إضافة وسيط جديد</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الوسيط *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="الاسم الكامل" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">رقم الجوال *</label>
                <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="05xxxxxxxx" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3} className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="اختياري" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
                  {submitting ? 'جارٍ الحفظ...' : 'إضافة'}
                </button>
                <button type="button" onClick={() => setShowNew(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
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
