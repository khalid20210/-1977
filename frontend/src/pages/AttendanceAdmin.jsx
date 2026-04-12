import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Clock, Users, UserCheck, UserX, Calendar, Search, Trash2, Loader } from 'lucide-react';

const API = '/api/attendance';

function formatTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}
function duration(check_in, check_out) {
  if (!check_in || !check_out) return null;
  const ms = new Date(check_out) - new Date(check_in);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}س ${m}د`;
}

const today = new Date().toISOString().slice(0, 10);

export default function AttendanceAdmin() {
  const { authFetch } = useAuth();
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date_from: today, date_to: today, user_id: '' });
  const [searchName, setSearchName] = useState('');
  const [view, setView] = useState('today'); // 'today' | 'range'

  const loadToday = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch(`${API}/admin/today`).then(r => r.json());
      setSummary(data);
      setRecords(data.records || []);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const loadRange = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to)   params.set('date_to',   filters.date_to);
      if (filters.user_id)   params.set('user_id',   filters.user_id);
      const data = await authFetch(`${API}/admin/all?${params}`).then(r => r.json());
      setSummary(null);
      setRecords(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [authFetch, filters]);

  useEffect(() => {
    if (view === 'today') loadToday();
    else loadRange();
  }, [view, loadToday, loadRange]);

  const handleDelete = async (id) => {
    if (!confirm('حذف هذا السجل؟')) return;
    await authFetch(`${API}/admin/${id}`, { method: 'DELETE' });
    setRecords(r => r.filter(x => x.id !== id));
  };

  const filtered = records.filter(r =>
    !searchName || (r.user_name || '').toLowerCase().includes(searchName.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">سجل حضور الموظفين</h1>

      {/* Today summary */}
      {view === 'today' && summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
            <Users size={24} className="text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700">{summary.total_employees}</p>
            <p className="text-sm text-blue-500 mt-1">إجمالي الموظفين</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-center">
            <UserCheck size={24} className="text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-700">{summary.present}</p>
            <p className="text-sm text-green-500 mt-1">حاضر</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
            <UserX size={24} className="text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-700">{summary.absent}</p>
            <p className="text-sm text-red-500 mt-1">غائب</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        {/* Tab switcher */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          <button
            onClick={() => setView('today')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'today' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <Calendar size={14} className="inline mr-1" />اليوم
          </button>
          <button
            onClick={() => setView('range')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'range' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <Clock size={14} className="inline mr-1" />فترة محددة
          </button>
        </div>

        {view === 'range' && (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1">من</label>
              <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">إلى</label>
              <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={loadRange}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              بحث
            </button>
          </>
        )}

        {/* Name search */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 ml-auto">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="بحث بالاسم..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            className="text-sm outline-none w-36"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader className="animate-spin text-blue-500" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد سجلات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-4 py-3 text-right">الموظف</th>
                  {view === 'range' && <th className="px-4 py-3 text-center">التاريخ</th>}
                  <th className="px-4 py-3 text-center">الحضور</th>
                  <th className="px-4 py-3 text-center">الانصراف</th>
                  <th className="px-4 py-3 text-center">المدة</th>
                  <th className="px-4 py-3 text-right">موقع الحضور</th>
                  <th className="px-4 py-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{r.user_name || '—'}</p>
                      <p className="text-xs text-gray-400 capitalize">{r.user_role}</p>
                    </td>
                    {view === 'range' && (
                      <td className="px-4 py-3 text-center text-gray-600">{formatDate(r.date)}</td>
                    )}
                    <td className="px-4 py-3 text-center">
                      {r.check_in ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 rounded-full px-2 py-0.5 text-xs font-medium">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          {formatTime(r.check_in)}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.check_out ? (
                        <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 rounded-full px-2 py-0.5 text-xs font-medium">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                          {formatTime(r.check_out)}
                        </span>
                      ) : r.check_in ? (
                        <span className="text-xs text-yellow-500">في العمل</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 font-medium">
                      {duration(r.check_in, r.check_out) || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                      {r.check_in_address ? (
                        <div className="flex items-start gap-1">
                          <MapPin size={11} className="text-blue-400 mt-0.5 shrink-0" />
                          <span className="truncate">{r.check_in_address.split(',').slice(0, 2).join(',')}</span>
                        </div>
                      ) : '—'}
                      {r.check_in_lat && r.check_in_lng && (
                        <a
                          href={`https://maps.google.com/?q=${r.check_in_lat},${r.check_in_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline block mt-0.5"
                        >
                          عرض على الخريطة ↗
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
