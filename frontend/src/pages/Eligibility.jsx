import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckCircle, XCircle, AlertCircle, Search, Building2,
  Loader, Lightbulb, ChevronDown, ClipboardCheck, Percent, Wallet, ShieldCheck, Landmark
} from 'lucide-react';

const FUNDING_TYPES = ['نقاط بيع', 'كاش', 'إقرارات ضريبية', 'رهن', 'أسطول', 'تمويل شخصي', 'عقار', 'تمويل تجاري'];
const ENTITY_TYPES  = ['مؤسسة', 'شركة شخص واحد', 'شركة متعددة الشركاء'];
const OWNERSHIP_TYPES = ['سعودي', 'مختلط', 'مستثمر'];
const FINANCIAL_STATEMENT_OPTIONS = ['لا', 'نعم'];
const TAX_RETURN_PERIOD_OPTIONS = ['ربعية', 'شهرية'];

const SAR = n => `${Number(n).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س`;

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none appearance-none bg-white"
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
    </div>
  );
}

function NumberInput({ value, onChange, placeholder = '0' }) {
  return (
    <input
      type="number"
      min="0"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
    />
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.blue}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center border border-current/10">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold opacity-80">{label}</p>
          <p className="text-lg font-black mt-0.5">{value}</p>
          {sub && <p className="text-[11px] mt-1 opacity-80">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Eligibility() {
  const { authFetch, isAdmin } = useAuth();

  const [form, setForm] = useState({
    fundingType:    'نقاط بيع',
    entityType:     'مؤسسة',
    ownershipType:  'سعودي',
    bankName:       '',
    totalPos:       '',
    totalDeposit:   '',
    totalTransfer:  '',
    recordAgeMonths:'24',
    hasFinancialStatements: 'لا',
    profitRatio: '',
    taxReturnPeriod: 'ربعية',
    hasRequiredTaxReturns: 'لا',
  });

  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const isPosFunding = form.fundingType === 'نقاط بيع';
  const isCashFunding = form.fundingType === 'كاش';
  const isTaxFunding = form.fundingType === 'إقرارات ضريبية';
  const requiredTaxReturnsCount = form.taxReturnPeriod === 'ربعية' ? 6 : 15;

  const handleFundingTypeChange = (e) => {
    const nextFundingType = e.target.value;
    setForm((current) => ({
      ...current,
      fundingType: nextFundingType,
      totalPos: nextFundingType === 'نقاط بيع' || nextFundingType === 'إقرارات ضريبية' ? current.totalPos : '',
      totalDeposit: nextFundingType === 'كاش' || nextFundingType === 'إقرارات ضريبية' ? current.totalDeposit : current.totalDeposit,
      totalTransfer: nextFundingType === 'نقاط بيع' || nextFundingType === 'كاش' || nextFundingType === 'إقرارات ضريبية' ? '' : current.totalTransfer,
      hasFinancialStatements: nextFundingType === 'كاش' ? current.hasFinancialStatements : 'لا',
      profitRatio: nextFundingType === 'كاش' && current.hasFinancialStatements === 'نعم' ? current.profitRatio : '',
      taxReturnPeriod: nextFundingType === 'إقرارات ضريبية' ? current.taxReturnPeriod : 'ربعية',
      hasRequiredTaxReturns: nextFundingType === 'إقرارات ضريبية' ? current.hasRequiredTaxReturns : 'لا',
    }));
  };

  const handleFinancialStatementsChange = (e) => {
    const nextValue = e.target.value;
    setForm((current) => ({
      ...current,
      hasFinancialStatements: nextValue,
      profitRatio: nextValue === 'نعم' ? current.profitRatio : '',
    }));
  };

  const handleTaxReturnPeriodChange = (e) => {
    const nextValue = e.target.value;
    setForm((current) => ({
      ...current,
      taxReturnPeriod: nextValue,
      hasRequiredTaxReturns: 'لا',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setChecked(false);
    try {
      const res = await authFetch('/api/requests/eligibility-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalPos:        isPosFunding || isTaxFunding ? (Number(form.totalPos) || 0) : 0,
          totalDeposit:    isCashFunding || isTaxFunding ? (Number(form.totalDeposit) || 0) : (Number(form.totalDeposit) || 0),
          totalTransfer:   isPosFunding || isCashFunding || isTaxFunding ? 0 : (Number(form.totalTransfer) || 0),
          months:          12,
          fundingType:     form.fundingType,
          bankName:        form.bankName,
          recordAgeMonths: Number(form.recordAgeMonths) || 0,
          ownershipType:   form.ownershipType,
          entityType:      form.entityType,
          liabilitiesAmount: 0,
          profitRatio:     form.hasFinancialStatements === 'نعم' ? (Number(form.profitRatio) || 0) : 0,
        }),
      });
      if (res.ok) {
        setResult(await res.json());
        setChecked(true);
      }
    } catch (_) {}
    setLoading(false);
  };

  const cashEligibleAlternative = checked && result?.entities?.length > 0;
  const declarationEligible = checked && isTaxFunding && form.hasRequiredTaxReturns === 'نعم';
  const eligible = isTaxFunding ? declarationEligible : cashEligibleAlternative;
  const statusTitle = isTaxFunding
    ? (declarationEligible ? 'أنت مؤهل لتمويل الإقرارات' : 'أنت غير مؤهل لتمويل الإقرارات حالياً')
    : (eligible ? 'المنشأة مؤهلة للتمويل' : 'المنشأة غير مؤهلة حالياً');
  const statusSubtitle = isTaxFunding
    ? (declarationEligible
        ? `تم تأكيد توفر آخر ${requiredTaxReturnsCount} إقرارات ${form.taxReturnPeriod === 'ربعية' ? 'ضريبية ربعية' : 'ضريبية شهرية'}.`
        : (cashEligibleAlternative
            ? `لكن أنت مؤهل لتمويل كاش لأن إجمالي إيداعاتك لآخر 12 شهر هو ${SAR(Number(form.totalDeposit) || 0)}.`
            : `يشترط توفر آخر ${requiredTaxReturnsCount} إقرارات ${form.taxReturnPeriod === 'ربعية' ? 'ضريبية ربعية' : 'ضريبية شهرية'} لهذه الحالة.`))
    : (eligible
        ? `وجدنا ${result.entities.length} جهة أو مسار تمويلي مناسب`
        : 'لا تستوفي المنشأة شروط التمويل المتاحة حالياً');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <ClipboardCheck size={24} className="text-blue-500" />
          فاحص أهلية المنشأة
        </h1>
        <p className="text-sm text-gray-500 mt-1">أدخل بيانات المنشأة لمعرفة مدى أهليتها للتمويل والجهات المناسبة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ─── Form ─── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Building2 size={17} className="text-blue-500" /> بيانات المنشأة
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="نوع التمويل">
                <Select value={form.fundingType} onChange={handleFundingTypeChange} options={FUNDING_TYPES} />
              </Field>
              <Field label="نوع المنشأة">
                <Select value={form.entityType} onChange={set('entityType')} options={ENTITY_TYPES} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="نوع الملكية">
                <Select value={form.ownershipType} onChange={set('ownershipType')} options={OWNERSHIP_TYPES} />
              </Field>
              <Field label="البنك الرئيسي">
                <input
                  value={form.bankName}
                  onChange={set('bankName')}
                  placeholder="مثال: الراجحي"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                />
              </Field>
            </div>

            {isPosFunding && (
              <div className="grid grid-cols-1 gap-3">
                <Field label="إجمالي نقاط البيع لآخر 12 شهر (ر.س)">
                  <NumberInput value={form.totalPos} onChange={set('totalPos')} placeholder="مثال: 1500000" />
                </Field>
              </div>
            )}

            {isCashFunding && (
              <>
                <div className="grid grid-cols-1 gap-3">
                  <Field label="إجمالي الإيداعات لآخر 12 شهر (ر.س)">
                    <NumberInput value={form.totalDeposit} onChange={set('totalDeposit')} placeholder="مثال: 3000000" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="هل يوجد قوائم مالية؟">
                    <Select
                      value={form.hasFinancialStatements}
                      onChange={handleFinancialStatementsChange}
                      options={FINANCIAL_STATEMENT_OPTIONS}
                    />
                  </Field>
                  {form.hasFinancialStatements === 'نعم' && (
                    <Field label="كم نسبة الربح؟ (%)">
                      <NumberInput value={form.profitRatio} onChange={set('profitRatio')} placeholder="8" />
                    </Field>
                  )}
                </div>
              </>
            )}

            {isTaxFunding && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="إجمالي نقاط البيع لآخر 12 شهر (ر.س)">
                    <NumberInput value={form.totalPos} onChange={set('totalPos')} placeholder="مثال: 1500000" />
                  </Field>
                  <Field label="إجمالي الإيداعات لآخر 12 شهر (ر.س)">
                    <NumberInput value={form.totalDeposit} onChange={set('totalDeposit')} placeholder="مثال: 3000000" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="نوع الإقرارات">
                    <Select value={form.taxReturnPeriod} onChange={handleTaxReturnPeriodChange} options={TAX_RETURN_PERIOD_OPTIONS} />
                  </Field>
                  <Field label={form.taxReturnPeriod === 'ربعية' ? 'هل يتوفر آخر 6 إقرارات ضريبية؟' : 'هل يتوفر آخر 15 إقراراً ضريبياً؟'}>
                    <Select value={form.hasRequiredTaxReturns} onChange={set('hasRequiredTaxReturns')} options={FINANCIAL_STATEMENT_OPTIONS} />
                  </Field>
                </div>
              </>
            )}

            {!isPosFunding && !isCashFunding && !isTaxFunding && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="إجمالي الإيداعات (ر.س)">
                    <NumberInput value={form.totalDeposit} onChange={set('totalDeposit')} />
                  </Field>
                  <Field label="إجمالي التحويلات (ر.س)">
                    <NumberInput value={form.totalTransfer} onChange={set('totalTransfer')} />
                  </Field>
                </div>
                <Field label="نسبة الربح بالقوائم (%)">
                  <NumberInput value={form.profitRatio} onChange={set('profitRatio')} placeholder="8" />
                </Field>
              </>
            )}

            <Field label="عمر السجل التجاري (شهر)">
              <NumberInput value={form.recordAgeMonths} onChange={set('recordAgeMonths')} placeholder="24" />
            </Field>

            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-[11px] text-gray-500 leading-6">
              يتم الاحتساب على آخر 12 شهر تلقائياً. نعرض فقط الحقول المرتبطة بنوع التمويل المختار لتقليل التشتت في الإدخال.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'جارٍ الفحص...' : 'فحص الأهلية'}
            </button>
          </form>
        </div>

        {/* ─── Results ─── */}
        <div className="lg:col-span-3 space-y-4">

          {!checked ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 text-gray-300">
              <Search size={52} className="mb-3 opacity-25" />
              <p className="text-sm text-gray-400">أدخل البيانات واضغط "فحص الأهلية"</p>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              <div className={`rounded-2xl border p-5 flex items-center gap-3 ${eligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {eligible
                  ? <CheckCircle size={24} className="text-green-500 shrink-0" />
                  : <XCircle    size={24} className="text-red-500 shrink-0" />}
                <div>
                  <p className={`font-bold text-lg ${eligible ? 'text-green-700' : 'text-red-700'}`}>
                    {statusTitle}
                  </p>
                  <p className={`text-xs mt-0.5 ${eligible ? 'text-green-600' : 'text-red-500'}`}>
                    {statusSubtitle}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard
                  icon={Wallet}
                  label="التمويل التقريبي"
                  value={SAR(result?.estimatedFundingAmount || 0)}
                  sub="قد يصل إلى 60% من الأساس المالي المعتمد"
                  tone="blue"
                />
                <StatCard
                  icon={Percent}
                  label="الفائدة المتوقعة"
                  value={result?.interestRateLabel || '7% - 14%'}
                  sub="تختلف حسب الجهة والملف النهائي"
                  tone="amber"
                />
                <StatCard
                  icon={ShieldCheck}
                  label="نسبة نجاح تقديرية"
                  value={`${result?.successProbability || 0}%`}
                  sub={result?.debtHealthy ? 'المديونيات ضمن النطاق المفضل' : 'المديونيات تضعف الملف حالياً'}
                  tone={result?.debtHealthy ? 'green' : 'purple'}
                />
                <StatCard
                  icon={Landmark}
                  label="نسبة المديونية"
                  value={`${result?.debtRatio || 0}%`}
                  sub={(result?.annualRevenue || 0) > 0 ? `مقارنة بإيراد تقريبي ${SAR(result?.annualRevenue || 0)}` : 'أدخل إيرادات أو نقاط بيع لاحتسابها'}
                  tone={result?.debtHealthy ? 'green' : 'amber'}
                />
              </div>

              {!!result?.matchedRules?.length && !isTaxFunding && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 mb-3">السيناريو المطابق</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.matchedRules.map((rule) => (
                      <span key={rule} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold">
                        {rule}
                      </span>
                    ))}
                  </div>
                  {result?.guaranteeNote && (
                    <p className="text-xs text-gray-500 mt-3 leading-6">{result.guaranteeNote}</p>
                  )}
                </div>
              )}

              {/* Eligible Entities — للأدمن فقط */}
              {eligible && isAdmin && !isTaxFunding && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 mb-4">الجهات التمويلية المناسبة</h3>
                  <div className="space-y-3">
                    {result.entities.map(e => (
                      <div key={e.id} className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <CheckCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-sm">{e.name}</p>
                          {e.notes && <p className="text-xs text-gray-500 mt-1">{e.notes}</p>}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {e.min_pos_amount > 0 && (
                              <span className="text-xs bg-white border border-blue-100 rounded-full px-2 py-0.5 text-blue-600">
                                حد أدنى POS: {SAR(e.min_pos_amount)}
                              </span>
                            )}
                            {e.min_months > 0 && (
                              <span className="text-xs bg-white border border-blue-100 rounded-full px-2 py-0.5 text-blue-600">
                                {e.min_months} أشهر كشف
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* رسالة للموظف/الشريك — لا يرى الجهات */}
              {eligible && !isAdmin && !isTaxFunding && (
                <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5 flex items-start gap-3">
                  <CheckCircle size={20} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-800 text-sm">المنشأة مؤهلة للتمويل</p>
                    <p className="text-xs text-blue-600 mt-1">يرجى رفع طلب وإرسال الملف الكامل — سيتولى المسؤول تحديد الجهة التمويلية المناسبة. التمويل التقريبي والفائدة المعروضة هنا استرشادية فقط.</p>
                  </div>
                </div>
              )}

              {/* Tips */}
              {result?.tips?.length > 0 && !isTaxFunding && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={17} className="text-amber-500" />
                    <h3 className="font-bold text-amber-800 text-sm">توصيات لتحسين الأهلية</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                        <AlertCircle size={13} className="shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Not eligible tips if no entities */}
              {isTaxFunding && !declarationEligible && cashEligibleAlternative && (
                <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={17} className="text-blue-500" />
                    <h3 className="font-bold text-blue-800 text-sm">بديل مناسب</h3>
                  </div>
                  <p className="text-xs leading-6 text-blue-700">
                    أنت غير مؤهل لتمويل الإقرارات حالياً، لكنك مؤهل لتمويل كاش لأن إجمالي إيداعاتك لآخر 12 شهر هو {SAR(Number(form.totalDeposit) || 0)}.
                  </p>
                </div>
              )}

              {!eligible && !result?.tips?.length && !isTaxFunding && (
                <div className="bg-orange-50 rounded-2xl border border-orange-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={17} className="text-orange-500" />
                    <h3 className="font-bold text-orange-800 text-sm">خطوات مقترحة</h3>
                  </div>
                  <ul className="space-y-1 text-xs text-orange-700 list-disc list-inside">
                    <li>تواصل مع مسؤول المبيعات لمراجعة الحالة يدوياً</li>
                    <li>يمكن رفع طلب وسيتم تحليله من قِبل الفريق</li>
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
