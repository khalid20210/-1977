import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, TrendingUp, Clock, CheckCircle, Loader, Award } from 'lucide-react';

const SAR = n => n > 0 ? `${Number(n).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س` : '—';

const STATUS_LABEL = {
  approved:      'موافق عليه',
  transferred:   'تم التحويل',
  fees_received: 'عمولة مستلمة',
};

const STATUS_COLOR = {
  approved:      'bg-green-50 text-green-700 border-green-100',
  transferred:   'bg-emerald-50 text-emerald-700 border-emerald-100',
  fees_received: 'bg-teal-50 text-teal-800 border-teal-100',
};

const MONTH_AR = m => new Date(m + '-01').toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

export default function Commissions() {
  const { authFetch } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    authFetch('/api/requests')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const filtered = (Array.isArray(data) ? data : [])
          .filter(r => ['approved', 'transferred', 'fees_received'].includes(r.status) && r.commission_amount > 0)
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        setRequests(filtered);
      })
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  // حساب الإجماليات
  const totalEarned   = requests.filter(r => r.status === 'fees_received').reduce((s, r) => s + r.commission_amount, 0);
  const totalPending  = requests.filter(r => ['approved','transferred'].includes(r.status)).reduce((s, r) => s + r.commission_amount, 0);
  const totalAll      = totalEarned + totalPending;

  // تجميع حسب الشهر
  const byMonth = {};
  requests.forEach(r => {
    const m = (r.updated_at || r.created_at || '').slice(0, 7);
    if (!byMonth[m]) byMonth[m] = { earned: 0, pending: 0, items: [] };
    if (r.status === 'fees_received') byMonth[m].earned += r.commission_amount;
    else byMonth[m].pending += r.commission_amount;
    byMonth[m].items.push(r);
  });
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader className="animate-spin text-blue-500" size={32} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Award size={24} className="text-emerald-500" />
          سجل العمولات
        </h1>
        <p className="text-sm text-gray-500 mt-1">كل العمولات المرتبطة بطلباتك المحالة</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/90 text-sm font-semibold mb-1">إجمالي المحصّل</p>
              <p className="text-2xl font-black">{SAR(totalEarned)}</p>
              <p className="text-white/80 text-xs mt-1">رسوم مستلمة مؤكدة</p>
            </div>
            <div className="bg-white/20 rounded-xl p-2.5"><CheckCircle size={20} /></div>
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/90 text-sm font-semibold mb-1">عمولات قيد الانتظار</p>
              <p className="text-2xl font-black">{SAR(totalPending)}</p>
              <p className="text-white/80 text-xs mt-1">طلبات معتمدة ومحوّلة</p>
            </div>
            <div className="bg-white/20 rounded-xl p-2.5"><Clock size={20} /></div>
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/90 text-sm font-semibold mb-1">الإجمالي الكلي</p>
              <p className="text-2xl font-black">{SAR(totalAll)}</p>
              <p className="text-white/80 text-xs mt-1">{requests.length} طلب</p>
            </div>
            <div className="bg-white/20 rounded-xl p-2.5"><TrendingUp size={20} /></div>
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
        </div>
      </div>

      {/* بدون بيانات */}
      {requests.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
          <DollarSign size={48} className="mb-3 opacity-20" />
          <p className="text-sm">لا توجد عمولات مسجلة بعد</p>
          <p className="text-xs text-gray-300 mt-1">ستظهر هنا بعد موافقة الأدمن على طلباتك</p>
        </div>
      )}

      {/* تفصيل شهري */}
      {months.map(month => (
        <div key={month} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* رأس الشهر */}
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/60">
            <h3 className="font-bold text-gray-800">{MONTH_AR(month)}</h3>
            <div className="flex items-center gap-4 text-xs">
              {byMonth[month].earned > 0 && (
                <span className="text-emerald-600 font-bold">محصّل: {SAR(byMonth[month].earned)}</span>
              )}
              {byMonth[month].pending > 0 && (
                <span className="text-amber-600 font-bold">منتظر: {SAR(byMonth[month].pending)}</span>
              )}
            </div>
          </div>

          {/* صفوف الطلبات */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-50">
                <th className="text-right px-5 py-2 font-medium">المنشأة</th>
                <th className="text-right px-4 py-2 font-medium">نوع التمويل</th>
                <th className="text-right px-4 py-2 font-medium">الحالة</th>
                <th className="text-right px-4 py-2 font-medium">العمولة</th>
                <th className="text-right px-4 py-2 font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {byMonth[month].items.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-gray-800">{r.company_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.funding_type || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${STATUS_COLOR[r.status] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-black text-emerald-600">{SAR(r.commission_amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(r.updated_at || r.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/80 border-t border-gray-100">
                <td colSpan={3} className="px-5 py-2.5 text-xs text-gray-500 font-semibold">إجمالي {MONTH_AR(month)}</td>
                <td className="px-4 py-2.5 font-black text-emerald-700 text-sm">{SAR(byMonth[month].earned + byMonth[month].pending)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ))}
    </div>
  );
}
