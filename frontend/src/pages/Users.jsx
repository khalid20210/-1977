import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCheck, UserX, Trash2, Search, Shield, User, Briefcase, Edit2, X, Plus } from 'lucide-react';

const roleLabel = { admin: 'مدير', employee: 'موظف', partner: 'شريك' };
const roleColor = { admin: 'bg-purple-100 text-purple-700', employee: 'bg-blue-100 text-blue-700', partner: 'bg-green-100 text-green-700' };
const statusColor = { approved: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', blocked: 'bg-red-100 text-red-700' };
const statusLabel = { approved: 'نشط', pending: 'بانتظار الموافقة', blocked: 'محظور' };

export default function Users() {
  const { authFetch } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await authFetch('/api/admin/users');
    const data = res.ok ? await res.json() : [];
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    const res = await authFetch(`/api/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    if (res.ok) load(); else alert('خطأ في التحديث');
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;
    const res = await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) load(); else { const d = await res.json(); alert(d.error || 'خطأ'); }
  };
  // Edit state
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ name: u.name || '', email: u.email || '', role: u.role || 'employee', phone: u.phone || '', partner_type: u.partner_type || '' });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSubmittingEdit(true);
    const res = await authFetch(`/api/admin/users/${editUser.id}`, { method: 'PUT', body: JSON.stringify(editForm) });
    const d = await res.json();
    if (!res.ok) alert(d.error || 'خطأ في التعديل');
    else { setEditUser(null); load(); }
    setSubmittingEdit(false);
  };
  // Add User state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'employee', phone: '', partner_type: '' });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const submitAdd = async (e) => {
    e.preventDefault();
    setSubmittingAdd(true);
    const res = await authFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(addForm) });
    const d = await res.json();
    if (!res.ok) alert(d.error || 'خطأ في الإنشاء');
    else { setShowAddModal(false); setAddForm({ name: '', email: '', password: '', role: 'employee', phone: '', partner_type: '' }); load(); }
    setSubmittingAdd(false);
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const pending = filtered.filter(u => u.status === 'pending');
  const others = filtered.filter(u => u.status !== 'pending');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">المستخدمون</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} مستخدم إجمالاً</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90"
          style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
          <Plus size={16} /> إضافة مستخدم
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو البريد..."
          className="w-full border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* بانتظار الموافقة */}
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-yellow-700 bg-yellow-50 px-4 py-2 rounded-xl mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                بانتظار الموافقة ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map(u => <UserRow key={u.id} u={u} onStatus={setStatus} onDelete={deleteUser} onEdit={openEdit} />)}
              </div>
            </div>
          )}

          {/* بقية المستخدمين */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {others.length === 0 ? (
              <div className="text-center py-12 text-gray-400">لا توجد نتائج</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {others.map(u => <UserRow key={u.id} u={u} onStatus={setStatus} onDelete={deleteUser} onEdit={openEdit} />)}
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">تعديل بيانات المستخدم</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={submitEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">الاسم *</label>
                <input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">البريد الإلكتروني *</label>
                <input required type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">الدور</label>
                  <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                    disabled={editUser.role === 'admin'}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="employee">موظف</option>
                    <option value="partner">شريك</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">رقم الجوال</label>
                  <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="اختياري" />
                </div>
              </div>
              {(editForm.role === 'partner') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">نوع الشراكة</label>
                  <input value={editForm.partner_type} onChange={e => setEditForm({ ...editForm, partner_type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="مثل: وسيط" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submittingEdit}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #92400e, #d97706)' }}>
                  {submittingEdit ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button type="button" onClick={() => setEditUser(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">إضافة مستخدم جديد</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={submitAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">الاسم *</label>
                <input required value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="الاسم الكامل" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">البريد الإلكتروني *</label>
                <input required type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="example@email.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">كلمة المرور *</label>
                <input required type="password" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="6 أحرف على الأقل" minLength={6} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">الدور</label>
                  <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="employee">موظف</option>
                    <option value="partner">شريك</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">رقم الجوال</label>
                  <input value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="اختياري" />
                </div>
              </div>
              {addForm.role === 'partner' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">نوع الشراكة</label>
                  <input value={addForm.partner_type} onChange={e => setAddForm({ ...addForm, partner_type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="مثل: وسيط" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submittingAdd}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
                  {submittingAdd ? 'جارٍ الإنشاء...' : 'إنشاء المستخدم'}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({ u, onStatus, onDelete, onEdit }) {
  const roleLabel = { admin: 'مدير', employee: 'موظف', partner: 'شريك' };
  const roleColor = { admin: 'bg-purple-100 text-purple-700', employee: 'bg-blue-100 text-blue-700', partner: 'bg-green-100 text-green-700' };
  const statusColor = { approved: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', blocked: 'bg-red-100 text-red-700' };
  const statusLabel = { approved: 'نشط', pending: 'بانتظار الموافقة', blocked: 'محظور' };

  return (
    <div className="flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-blue-700 font-bold text-sm">{u.name?.[0] || '?'}</span>
        </div>
        <div>
          <div className="font-semibold text-gray-900 text-sm">{u.name}</div>
          <div className="text-gray-400 text-xs">{u.email}</div>
          {u.phone && <div className="text-gray-400 text-xs">{u.phone}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${roleColor[u.role] || 'bg-gray-100 text-gray-600'}`}>
          {roleLabel[u.role] || u.role}
        </span>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusColor[u.status] || 'bg-gray-100 text-gray-600'}`}>
          {statusLabel[u.status] || u.status}
        </span>
        {u.status === 'pending' && (
          <button onClick={() => onStatus(u.id, 'approved')}
            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors" title="قبول">
            <UserCheck size={14} />
          </button>
        )}
        {u.status === 'approved' && (
          <button onClick={() => onStatus(u.id, 'blocked')}
            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="حظر">
            <UserX size={14} />
          </button>
        )}
        {u.status === 'blocked' && (
          <button onClick={() => onStatus(u.id, 'approved')}
            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors" title="رفع الحظر">
            <UserCheck size={14} />
          </button>
        )}
        {u.role !== 'admin' && (
          <button onClick={() => onEdit(u)}
            className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="تعديل">
            <Edit2 size={14} />
          </button>
        )}
        {u.role !== 'admin' && (
          <button onClick={() => onDelete(u.id, u.name)}
            className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors" title="حذف">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
