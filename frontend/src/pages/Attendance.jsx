import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, LogIn, LogOut, Clock, Calendar, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const API = '/api/attendance';

function formatTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-SA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}
function duration(check_in, check_out) {
  if (!check_in || !check_out) return null;
  const ms = new Date(check_out) - new Date(check_in);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}س ${m}د`;
}

export default function Attendance() {
  const { authFetch } = useAuth();
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null); // {text, type:'success'|'error'}

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const reload = useCallback(async () => {
    try {
      const [t, h] = await Promise.all([
        authFetch(`${API}/today`).then(r => r.json()),
        authFetch(`${API}/my`).then(r => r.json()),
      ]);
      setToday(t);
      setHistory(Array.isArray(h) ? h : []);
    } catch {
      flash('فشل في جلب البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { reload(); }, [reload]);

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('المتصفح لا يدعم تحديد الموقع'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      err => { setLocating(false); reject(err); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  const reverseGeocode = async (lat, lng) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`);
      const data = await r.json();
      return data.display_name || '';
    } catch {
      return '';
    }
  };

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      const { lat, lng } = await getLocation();
      const address = await reverseGeocode(lat, lng);
      const r = await authFetch(`${API}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, address }),
      });
      const data = await r.json();
      if (!r.ok) return flash(data.error || 'فشل تسجيل الحضور', 'error');
      flash('تم تسجيل حضورك بنجاح ✓');
      reload();
    } catch (err) {
      flash(err.message || 'خطأ في الوصول للموقع', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setSubmitting(true);
    try {
      const { lat, lng } = await getLocation();
      const address = await reverseGeocode(lat, lng);
      const r = await authFetch(`${API}/check-out`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, address }),
      });
      const data = await r.json();
      if (!r.ok) return flash(data.error || 'فشل تسجيل الانصراف', 'error');
      flash('تم تسجيل انصرافك بنجاح ✓');
      reload();
    } catch (err) {
      flash(err.message || 'خطأ في الوصول للموقع', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || locating;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader className="animate-spin text-blue-500" size={32} />
    </div>
  );

  const nowDate = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Flash */}
      {msg && (
        <div className={`rounded-xl p-4 flex items-center gap-3 text-sm font-medium ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      {/* Today card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">حضور اليوم</h2>
          <span className="text-sm text-gray-500 flex items-center gap-1"><Calendar size={14} />{nowDate}</span>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-xs text-blue-600 mb-1 font-medium">وقت الحضور</p>
            <p className="text-xl font-bold text-blue-700">{today?.check_in ? formatTime(today.check_in) : '—'}</p>
            {today?.check_in_address && (
              <p className="text-xs text-blue-500 mt-1 flex items-center justify-center gap-1 truncate">
                <MapPin size={10} /><span className="truncate">{today.check_in_address.split(',')[0]}</span>
              </p>
            )}
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <p className="text-xs text-purple-600 mb-1 font-medium">وقت الانصراف</p>
            <p className="text-xl font-bold text-purple-700">{today?.check_out ? formatTime(today.check_out) : '—'}</p>
            {today?.check_out && today?.check_in && (
              <p className="text-xs text-purple-500 mt-1 flex items-center justify-center gap-1">
                <Clock size={10} />{duration(today.check_in, today.check_out)}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {!today?.check_in && (
            <button
              onClick={handleCheckIn}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {busy ? <Loader size={18} className="animate-spin" /> : <LogIn size={18} />}
              {locating ? 'جاري تحديد موقعك...' : submitting ? 'جاري التسجيل...' : 'تسجيل الحضور'}
            </button>
          )}
          {today?.check_in && !today?.check_out && (
            <button
              onClick={handleCheckOut}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {busy ? <Loader size={18} className="animate-spin" /> : <LogOut size={18} />}
              {locating ? 'جاري تحديد موقعك...' : submitting ? 'جاري التسجيل...' : 'تسجيل الانصراف'}
            </button>
          )}
          {today?.check_in && today?.check_out && (
            <div className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-500 font-medium py-3 rounded-xl">
              <CheckCircle size={18} className="text-green-500" />
              انتهى يومك — {duration(today.check_in, today.check_out)}
            </div>
          )}
        </div>

        {!navigator.geolocation && (
          <p className="text-xs text-red-500 mt-3 text-center">⚠ متصفحك لا يدعم تحديد الموقع</p>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">السجل السابق</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-right">اليوم</th>
                <th className="px-4 py-3 text-center">الحضور</th>
                <th className="px-4 py-3 text-center">الانصراف</th>
                <th className="px-4 py-3 text-center">المدة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">{formatTime(r.check_in)}</td>
                  <td className="px-4 py-3 text-center text-orange-600 font-medium">{formatTime(r.check_out)}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{duration(r.check_in, r.check_out) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
