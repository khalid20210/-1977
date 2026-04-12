import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp, DollarSign, Award, BarChart2, Users, CheckCircle,
  XCircle, Pencil, Check, X, Loader, Building2, FileText
} from 'lucide-react';

const SAR = n => n > 0 ? `${Number(n).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س` : '—';
const MONTH_AR = m => new Date(m + '-01').toLocaleDateString('ar-SA', { month: 'short' });

const STATUS_LABEL = {
  draft:'مسودة', bank_uploaded:'كشف مرفوع', analyzing:'تحليل', analyzed:'تم التحليل',
  docs_pending:'وثائق ناقصة', docs_ready:'وثائق جاهزة', contract_submitted:'عقد مُرسل',
  forms_ready:'نماذج جاهزة', forms_sent:'نماذج مُرسلة', file_submitted:'ملف مُرفوع',
  missing:'نواقص', missing_submitted:'نواقص مُكملة', contract_received:'عقد مُستلم',
  submitted:'مُرسل للجهة', approved:'مُعتمد', transferred:'محوّل',
  fees_received:'رسوم مُستلمة', rejected:'مرفوض',
};

// ── Inline Commission Edit ───────────────────────────────────────────────────
function CommissionEdit({ dealId, current, onSaved, authFetch }) {
  const [editing, setEditing]   = useState(false);
  const [val, setVal]           = useState(current || '');
  const [saving, setSaving]     = useState(false);

  const save = async () => {
    setSaving(true);
    const r = await authFetch(`/api/admin/requests/${dealId}/commission`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission_amount: parseFloat(val) || 0 }),
    });
    if (r.ok) onSaved(dealId, parseFloat(val) || 0);
    setEditing(false);
    setSaving(false);
  };

  if (editing) return (
    <div className="flex items-center gap-1">
      <input type="number" value={val} onChange={e => setVal(e.target.value)} min="0"
        className="w-24 border border-blue-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200" />
      <button onClick={save} disabled={saving} className="text-green-600 hover:bg-green-50 p-1 rounded">
        <Check size={13} />
      </button>
      <button onClick={() => setEditing(false)} className="text-gray-400 hover:bg-gray-50 p-1 rounded">
        <X size={13} />
      </button>
    </div>
  );
  return (
    <div className="flex items-center gap-1 group">
      <span className={current > 0 ? 'text-emerald-600 font-semibold text-xs' : 'text-gray-400 text-xs'}>{SAR(current)}</span>
      <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 p-0.5 rounded transition-opacity">
        <Pencil size={11} />
      </button>
    </div>
  );
}

export default function Reports() {
  const { authFetch } = useAuth();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [year, setYear]         = useState(new Date().getFullYear().toString());
  const [tab, setTab]           = useState('revenue'); // 'revenue'|'funnel'|'employees'|'entities'|'deals'
  const [deals, setDeals]       = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await authFetch(`/api/admin/reports?year=${year}`).then(r => r.json());
      setData(d);
      setDeals(d.closed_deals || []);
    } finally { setLoading(false); }
  }, [authFetch, year]);

  useEffect(() => { load(); }, [load]);

  const handleCommissionSaved = (id, amount) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, commission_amount: amount } : d));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader className="animate-spin text-blue-500" size={32} />
    </div>
  );
  if (!data) return null;

  const { monthly, funnel, entities, top_users } = data;
  const maxRev  = Math.max(...monthly.map(m => m.revenue), 1);
  const maxNew  = Math.max(...monthly.map(m => m.new_requests), 1);
  const ytdRev  = monthly.reduce((s, m) => s + m.revenue, 0);
  const ytdClosed = monthly.reduce((s, m) => s + m.closed, 0);
  const ytdNew  = monthly.reduce((s, m) => s + m.new_requests, 0);
  const maxFunnel = Math.max(...funnel.map(f => f.count), 1);
  const maxEntity = Math.max(...entities.map(e => e.approved), 1);

  const TABS = [
    { k: 'revenue',   l: 'الإيرادات الشهرية' },
    { k: 'funnel',    l: 'قمع التحويل' },
    { k: 'employees', l: 'أداء الموظفين' },
    { k: 'entities',  l: 'جهات التمويل' },
    { k: 'deals',     l: 'الصفقات المغلقة' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التقارير والتحليلات</h1>
          <p className="text-sm text-gray-400 mt-0.5">عرض شامل لأداء المنصة والإيرادات</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">السنة</label>
          <select value={year} onChange={e => setYear(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-md">
          <DollarSign size={20} className="mb-2 opacity-80" />
          <p className="text-2xl font-black">{SAR(ytdRev)}</p>
          <p className="text-green-100 text-xs mt-1">إجمالي إيرادات {year}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-sky-600 rounded-2xl p-5 text-white shadow-md">
          <CheckCircle size={20} className="mb-2 opacity-80" />
          <p className="text-2xl font-black">{ytdClosed}</p>
          <p className="text-blue-100 text-xs mt-1">صفقات مغلقة</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md">
          <FileText size={20} className="mb-2 opacity-80" />
          <p className="text-2xl font-black">{ytdNew}</p>
          <p className="text-purple-100 text-xs mt-1">طلبات جديدة</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${tab === t.k ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.l}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── Revenue Tab ── */}
          {tab === 'revenue' && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-5">الإيرادات والطلبات شهرياً — {year}</p>
              {/* Bar Chart */}
              <div className="flex items-end gap-2 h-48 mb-4">
                {monthly.map((m, i) => {
                  const revH = Math.max(4, Math.round((m.revenue / maxRev) * 160));
                  const newH = Math.max(2, Math.round((m.new_requests / maxNew) * 160));
                  const hasCurrent = m.month === new Date().toISOString().slice(0,7);
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex items-end justify-center gap-0.5" style={{ height: '160px' }}>
                        <div title={`إيرادات: ${SAR(m.revenue)}`}
                          className={`flex-1 rounded-t-md cursor-pointer transition-all ${hasCurrent ? 'bg-emerald-500 opacity-100' : 'bg-emerald-200 hover:bg-emerald-400'}`}
                          style={{ height: `${revH}px` }} />
                        <div title={`طلبات: ${m.new_requests}`}
                          className={`flex-1 rounded-t-md cursor-pointer transition-all ${hasCurrent ? 'bg-blue-500 opacity-100' : 'bg-blue-200 hover:bg-blue-400'}`}
                          style={{ height: `${newH}px` }} />
                      </div>
                      <span className={`text-xs ${hasCurrent ? 'font-bold text-gray-800' : 'text-gray-400'}`}>{MONTH_AR(m.month)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-6">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" />إيرادات</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-300 inline-block" />طلبات جديدة</span>
              </div>

              {/* Monthly Table */}
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="text-right py-2 font-medium">الشهر</th>
                    <th className="text-center py-2 font-medium">طلبات جديدة</th>
                    <th className="text-center py-2 font-medium">معتمدة</th>
                    <th className="text-center py-2 font-medium">مغلقة (رسوم)</th>
                    <th className="text-center py-2 font-medium">الإيرادات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthly.filter(m => m.new_requests > 0 || m.closed > 0).map(m => (
                    <tr key={m.month} className="hover:bg-gray-50">
                      <td className="py-2.5 font-medium text-gray-700">{m.month}</td>
                      <td className="py-2.5 text-center text-gray-600">{m.new_requests || '—'}</td>
                      <td className="py-2.5 text-center text-blue-600 font-medium">{m.approved || '—'}</td>
                      <td className="py-2.5 text-center text-green-600 font-medium">{m.closed || '—'}</td>
                      <td className="py-2.5 text-center text-emerald-700 font-bold">{SAR(m.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-200">
                  <tr className="font-bold">
                    <td className="py-2.5 text-gray-700">الإجمالي</td>
                    <td className="py-2.5 text-center text-gray-700">{ytdNew}</td>
                    <td className="py-2.5 text-center text-blue-700">{monthly.reduce((s,m)=>s+m.approved,0)}</td>
                    <td className="py-2.5 text-center text-green-700">{ytdClosed}</td>
                    <td className="py-2.5 text-center text-emerald-700">{SAR(ytdRev)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ── Funnel Tab ── */}
          {tab === 'funnel' && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700 mb-4">توزيع الطلبات على المراحل (إجمالي)</p>
              {funnel.map(f => {
                const pct = Math.round((f.count / maxFunnel) * 100);
                const isGood = ['approved','transferred','fees_received'].includes(f.status);
                const isBad  = f.status === 'rejected';
                const isWarn = f.status === 'missing';
                return (
                  <div key={f.status} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-32 shrink-0 text-right">{STATUS_LABEL[f.status] || f.status}</span>
                    <div className="flex-1 h-7 bg-gray-100 rounded-xl overflow-hidden relative">
                      <div className={`h-full rounded-xl transition-all flex items-center justify-end pr-2 ${isGood ? 'bg-green-400' : isBad ? 'bg-red-400' : isWarn ? 'bg-orange-400' : 'bg-blue-300'}`}
                        style={{ width: `${Math.max(pct,3)}%` }}>
                        <span className="text-white text-xs font-bold">{f.count}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-left shrink-0">{pct}%</span>
                  </div>
                );
              })}
              <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 flex gap-4">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" />مكتمل / مُعتمد</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block" />يحتاج تدخلاً</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" />مرفوض</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-300 inline-block" />قيد المعالجة</span>
              </div>
            </div>
          )}

          {/* ── Employees Tab ── */}
          {tab === 'employees' && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-4">أداء الموظفين والشركاء — {year}</p>
              {top_users.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users size={36} className="mx-auto mb-2 opacity-30" />
                  <p>لا توجد بيانات</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="text-right py-2 font-medium">#</th>
                      <th className="text-right py-2 font-medium">الاسم</th>
                      <th className="text-center py-2 font-medium">الإجمالي</th>
                      <th className="text-center py-2 font-medium">معتمد</th>
                      <th className="text-center py-2 font-medium">مرفوض</th>
                      <th className="text-center py-2 font-medium">معدل الإنجاز</th>
                      <th className="text-center py-2 font-medium">الإيرادات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {top_users.map((u, i) => {
                      const rate = u.total > 0 ? Math.round((u.approved / u.total) * 100) : 0;
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-3 text-gray-400 font-bold">{i + 1}</td>
                          <td className="py-3">
                            <p className="font-semibold text-gray-800">{u.name}</p>
                            <p className="text-xs text-gray-400">{u.role === 'employee' ? 'موظف' : 'شريك'}</p>
                          </td>
                          <td className="py-3 text-center text-gray-700">{u.total}</td>
                          <td className="py-3 text-center text-green-600 font-semibold">{u.approved}</td>
                          <td className="py-3 text-center text-red-500">{u.rejected || '—'}</td>
                          <td className="py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-sm font-bold ${rate >= 50 ? 'text-green-600' : rate >= 25 ? 'text-yellow-600' : 'text-orange-500'}`}>{rate}%</span>
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${rate >= 50 ? 'bg-green-400' : rate >= 25 ? 'bg-yellow-400' : 'bg-orange-400'}`} style={{ width: `${rate}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-center text-emerald-700 font-bold">{SAR(u.revenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Entities Tab ── */}
          {tab === 'entities' && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-4">أداء جهات التمويل</p>
              {entities.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Building2 size={36} className="mx-auto mb-2 opacity-30" />
                  <p>لا توجد بيانات</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entities.map((e, i) => {
                    const rate = e.total_sent > 0 ? Math.round((e.approved / e.total_sent) * 100) : 0;
                    const barW = Math.max(4, Math.round((e.approved / Math.max(maxEntity, 1)) * 100));
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${i===0?'bg-amber-100 text-amber-700':i===1?'bg-gray-200 text-gray-600':'bg-gray-100 text-gray-500'}`}>{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm text-gray-800 truncate">{e.name}</span>
                            <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0 mr-2">
                              <span>{e.total_sent} إرسال</span>
                              <span className="text-green-600 font-semibold">{e.approved} موافقة</span>
                              <span className="text-blue-600">{rate}%</span>
                              {e.revenue > 0 && <span className="text-emerald-700 font-bold">{SAR(e.revenue)}</span>}
                            </div>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${barW}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Closed Deals Tab ── */}
          {tab === 'deals' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700">الصفقات المغلقة — {year} ({deals.length} صفقة · {SAR(deals.reduce((s,d)=>s+d.commission_amount,0))} إجمالي)</p>
                <p className="text-xs text-gray-400">اضغط على العمولة لتعديلها</p>
              </div>
              {deals.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle size={36} className="mx-auto mb-2 opacity-30" />
                  <p>لا توجد صفقات مغلقة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-400 border-b border-gray-100">
                      <tr>
                        <th className="text-right py-2 font-medium">الشركة</th>
                        <th className="text-center py-2 font-medium">نوع التمويل</th>
                        <th className="text-center py-2 font-medium">الموظف</th>
                        <th className="text-center py-2 font-medium">الجهة</th>
                        <th className="text-center py-2 font-medium">التاريخ</th>
                        <th className="text-center py-2 font-medium">العمولة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {deals.map(d => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="py-3 font-semibold text-gray-800">{d.company_name}</td>
                          <td className="py-3 text-center text-gray-600 text-xs">{d.funding_type}</td>
                          <td className="py-3 text-center text-gray-500 text-xs">{d.user_name || '—'}</td>
                          <td className="py-3 text-center text-gray-500 text-xs">{d.entity_name || '—'}</td>
                          <td className="py-3 text-center text-gray-400 text-xs">
                            {new Date(d.updated_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-3 text-center">
                            <CommissionEdit dealId={d.id} current={d.commission_amount} onSaved={handleCommissionSaved} authFetch={authFetch} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
