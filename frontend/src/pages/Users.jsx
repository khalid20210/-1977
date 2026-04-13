import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCheck, UserX, Trash2, Search, Shield, User, Briefcase, Edit2, X, Plus, Bell, Send } from 'lucide-react';

const roleLabel = { admin: 'Ù…Ø¯ÙŠØ±', employee: 'Ù…ÙˆØ¸Ù', partner: 'Ø´Ø±ÙŠÙƒ' };
const roleColor = { admin: 'bg-purple-100 text-purple-700', employee: 'bg-blue-100 text-blue-700', partner: 'bg-green-100 text-green-700' };
const statusColor = { approved: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', blocked: 'bg-red-100 text-red-700' };
const statusLabel = { approved: 'Ù†Ø´Ø·', pending: 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©', blocked: 'Ù…Ø­Ø¸ÙˆØ±' };

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
    if (res.ok) load(); else alert('Ø®Ø·Ø£ ÙÙŠ Ø§Ù„ØªØ­Ø¯ÙŠØ«');
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù "${name}"ØŸ`)) return;
    const res = await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) load(); else { const d = await res.json(); alert(d.error || 'Ø®Ø·Ø£'); }
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
    if (!res.ok) alert(d.error || 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„');
    else { setEditUser(null); load(); }
    setSubmittingEdit(false);
  };
  // Add User state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'employee', phone: '', partner_type: '' });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Notification state
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifTarget, setNotifTarget] = useState('all');
  const [notifUserId, setNotifUserId] = useState('');
  const [notifForm, setNotifForm] = useState({ title: '', body: '', type: 'general' });
  const [sendingNotif, setSendingNotif] = useState(false);

  const sendNotification = async (e) => {
    e.preventDefault();
    if (!notifForm.title.trim()) return;
    setSendingNotif(true);
    try {
      const payload = notifTarget === 'all'
        ? { ...notifForm, target: 'all' }
        : { ...notifForm, user_id: Number(notifUserId) };
      const res = await authFetch('/api/notifications', { method: 'POST', body: JSON.stringify(payload) });
      const d = await res.json();
      if (res.ok) {
        setShowNotifModal(false);
        setNotifForm({ title: '', body: '', type: 'general' });
        alert(notifTarget === 'all' ? 'تم إرسال التنبيه للجميع' : 'تم إرسال التنبيه');
      } else { alert(d.error || 'خطأ'); }
    } catch (_) { alert('خطأ في الاتصال'); }
    setSendingNotif(false);
  };

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
          <h1 className="text-2xl font-black text-gray-900">Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ†</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} Ù…Ø³ØªØ®Ø¯Ù… Ø¥Ø¬Ù…Ø§Ù„Ø§Ù‹</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNotifModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <Bell size={16} /> إرسال تنبيه
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
            <Plus size={16} /> إضافة مستخدم
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ø³Ù… Ø£Ùˆ Ø§Ù„Ø¨Ø±ÙŠØ¯..."
          className="w-full border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© */}
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-yellow-700 bg-yellow-50 px-4 py-2 rounded-xl mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map(u => <UserRow key={u.id} u={u} onStatus={setStatus} onDelete={deleteUser} onEdit={openEdit} />)}
              </div>
            </div>
          )}

          {/* Ø¨Ù‚ÙŠØ© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {others.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬</div>
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
              <h2 className="text-lg font-black text-gray-900">ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={submitEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ø§Ù„Ø§Ø³Ù… *</label>
                <input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ *</label>
                <input required type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ø§Ù„Ø¯ÙˆØ±</label>
                  <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                    disabled={editUser.role === 'admin'}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="employee">Ù…ÙˆØ¸Ù</option>
                    <option value="partner">Ø´Ø±ÙŠÙƒ</option>
                    <option value="admin">Ù…Ø¯ÙŠØ±</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„</label>
                  <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ø§Ø®ØªÙŠØ§Ø±ÙŠ" />
                </div>
              </div>
              {(editForm.role === 'partner') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ù†ÙˆØ¹ Ø§Ù„Ø´Ø±Ø§ÙƒØ©</label>
                  <input value={editForm.partner_type} onChange={e => setEditForm({ ...editForm, partner_type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ù…Ø«Ù„: ÙˆØ³ÙŠØ·" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submittingEdit}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #92400e, #d97706)' }}>
                  {submittingEdit ? 'Ø¬Ø§Ø±Ù Ø§Ù„Ø­ÙØ¸...' : 'Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª'}
                </button>
                <button type="button" onClick={() => setEditUser(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">Ø¥Ù„ØºØ§Ø¡</button>
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
              <h2 className="text-lg font-black text-gray-900">Ø¥Ø¶Ø§ÙØ© Ù…Ø³ØªØ®Ø¯Ù… Ø¬Ø¯ÙŠØ¯</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={submitAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ø§Ù„Ø§Ø³Ù… *</label>
                <input required value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ *</label>
                <input required type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="example@email.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± *</label>
                <input required type="password" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="6 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„" minLength={6} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ø§Ù„Ø¯ÙˆØ±</label>
                  <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="employee">Ù…ÙˆØ¸Ù</option>
                    <option value="partner">Ø´Ø±ÙŠÙƒ</option>
                    <option value="admin">Ù…Ø¯ÙŠØ±</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„</label>
                  <input value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ø§Ø®ØªÙŠØ§Ø±ÙŠ" />
                </div>
              </div>
              {addForm.role === 'partner' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ù†ÙˆØ¹ Ø§Ù„Ø´Ø±Ø§ÙƒØ©</label>
                  <input value={addForm.partner_type} onChange={e => setAddForm({ ...addForm, partner_type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ù…Ø«Ù„: ÙˆØ³ÙŠØ·" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submittingAdd}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
                  {submittingAdd ? 'Ø¬Ø§Ø±Ù Ø§Ù„Ø¥Ù†Ø´Ø§Ø¡...' : 'Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…'}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">Ø¥Ù„ØºØ§Ø¡</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Bell size={18} className="text-white" />
                </div>
                <h2 className="text-white font-bold text-base">إرسال تنبيه</h2>
              </div>
              <button onClick={() => setShowNotifModal(false)} className="text-white/70 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={sendNotification} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">المستلم</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNotifTarget('all')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${notifTarget === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    الجميع
                  </button>
                  <button type="button" onClick={() => setNotifTarget('user')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${notifTarget === 'user' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    مستخدم محدد
                  </button>
                </div>
              </div>
              {notifTarget === 'user' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">اختر المستخدم</label>
                  <select value={notifUserId} onChange={e => setNotifUserId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                    <option value="">-- اختر مستخدماً --</option>
                    {users.filter(u => u.role !== 'admin').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role === 'employee' ? 'موظف' : 'شريك'})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع التنبيه</label>
                <select value={notifForm.type} onChange={e => setNotifForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="general">🔔 عام</option>
                  <option value="message">💬 رسالة</option>
                  <option value="update">🔄 تحديث</option>
                  <option value="warning">⚠️ تحذير</option>
                  <option value="success">✅ نجاح</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">عنوان التنبيه <span className="text-red-500">*</span></label>
                <input type="text" value={notifForm.title} onChange={e => setNotifForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="عنوان التنبيه..." required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">تفاصيل (اختياري)</label>
                <textarea value={notifForm.body} onChange={e => setNotifForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="نص التنبيه التفصيلي..." rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={sendingNotif}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                  <Send size={15} />
                  {sendingNotif ? 'جارٍ الإرسال...' : 'إرسال التنبيه'}
                </button>
                <button type="button" onClick={() => setShowNotifModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({ u, onStatus, onDelete, onEdit }) {
  const roleLabel = { admin: 'Ù…Ø¯ÙŠØ±', employee: 'Ù…ÙˆØ¸Ù', partner: 'Ø´Ø±ÙŠÙƒ' };
  const roleColor = { admin: 'bg-purple-100 text-purple-700', employee: 'bg-blue-100 text-blue-700', partner: 'bg-green-100 text-green-700' };
  const statusColor = { approved: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', blocked: 'bg-red-100 text-red-700' };
  const statusLabel = { approved: 'Ù†Ø´Ø·', pending: 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©', blocked: 'Ù…Ø­Ø¸ÙˆØ±' };

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
            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors" title="Ù‚Ø¨ÙˆÙ„">
            <UserCheck size={14} />
          </button>
        )}
        {u.status === 'approved' && (
          <button onClick={() => onStatus(u.id, 'blocked')}
            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Ø­Ø¸Ø±">
            <UserX size={14} />
          </button>
        )}
        {u.status === 'blocked' && (
          <button onClick={() => onStatus(u.id, 'approved')}
            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors" title="Ø±ÙØ¹ Ø§Ù„Ø­Ø¸Ø±">
            <UserCheck size={14} />
          </button>
        )}
        {u.role !== 'admin' && (
          <button onClick={() => onEdit(u)}
            className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="ØªØ¹Ø¯ÙŠÙ„">
            <Edit2 size={14} />
          </button>
        )}
        {u.role !== 'admin' && (
          <button onClick={() => onDelete(u.id, u.name)}
            className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors" title="Ø­Ø°Ù">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}






