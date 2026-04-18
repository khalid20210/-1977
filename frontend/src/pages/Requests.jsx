import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, Plus, Eye, Send, ChevronDown, X, Phone, Building2,
  User, FileText, Edit2, Trash2, AlertTriangle, Upload
} from 'lucide-react';

const STATUS_MAP = {
  draft:              { label: 'مسودة',               color: 'bg-gray-100 text-gray-600' },
  bank_uploaded:      { label: 'كشف مرفوع',           color: 'bg-blue-100 text-blue-700' },
  analyzing:          { label: 'قيد التحليل',          color: 'bg-purple-100 text-purple-700' },
  analyzed:           { label: 'تم التحليل',           color: 'bg-indigo-100 text-indigo-700' },
  docs_pending:       { label: 'يستلزم مستندات',       color: 'bg-yellow-100 text-yellow-700' },
  docs_ready:         { label: 'المستندات جاهزة',      color: 'bg-teal-100 text-teal-700' },
  contract_submitted: { label: 'عقد مرسل',             color: 'bg-cyan-100 text-cyan-700' },
  forms_ready:        { label: 'نماذج جاهزة',          color: 'bg-sky-100 text-sky-700' },
  forms_sent:         { label: 'نماذج مرسلة',          color: 'bg-sky-100 text-sky-700' },
  file_submitted:     { label: 'ملف مقدم',             color: 'bg-blue-100 text-blue-700' },
  missing:            { label: 'نواقص',                color: 'bg-orange-100 text-orange-700' },
  missing_submitted:  { label: 'نواقص مقدمة',          color: 'bg-orange-100 text-orange-600' },
  contract_received:  { label: 'عقد مستلم',            color: 'bg-lime-100 text-lime-700' },
  submitted:          { label: 'مقدم للجهة',           color: 'bg-violet-100 text-violet-700' },
  approved:           { label: 'موافق عليه',           color: 'bg-green-100 text-green-700' },
  transferred:        { label: 'تم التحويل',           color: 'bg-emerald-100 text-emerald-700' },
  fees_received:      { label: 'عمولة مستلمة',         color: 'bg-green-100 text-green-800' },
  rejected:           { label: 'مرفوض',                color: 'bg-red-100 text-red-700' },
};

const USER_STATUS_MAP = {
  draft:              { label: 'تم التقديم',      color: 'bg-blue-100 text-blue-700' },
  bank_uploaded:      { label: 'تم الرفع',        color: 'bg-purple-100 text-purple-700' },
  analyzing:          { label: 'تم الرفع',        color: 'bg-purple-100 text-purple-700' },
  analyzed:           { label: 'تم الرفع',        color: 'bg-purple-100 text-purple-700' },
  docs_pending:       { label: 'استكمال نواقص',   color: 'bg-orange-100 text-orange-700' },
  docs_ready:         { label: 'تم الرفع',        color: 'bg-purple-100 text-purple-700' },
  contract_submitted: { label: 'تم الرفع',        color: 'bg-purple-100 text-purple-700' },
  forms_ready:        { label: 'تحديد مبلغ',      color: 'bg-green-100 text-green-700' },
  forms_sent:         { label: 'تحديد مبلغ',      color: 'bg-green-100 text-green-700' },
  file_submitted:     { label: 'تم الرفع',        color: 'bg-purple-100 text-purple-700' },
  missing:            { label: 'استكمال نواقص',   color: 'bg-orange-100 text-orange-700' },
  missing_submitted:  { label: 'تم الرفع',        color: 'bg-purple-100 text-purple-700' },
  contract_received:  { label: 'التوقيع',         color: 'bg-cyan-100 text-cyan-700' },
  submitted:          { label: 'تم التقديم',      color: 'bg-blue-100 text-blue-700' },
  approved:           { label: 'تحديد مبلغ',      color: 'bg-green-100 text-green-700' },
  transferred:        { label: 'تم الاستلام',     color: 'bg-emerald-100 text-emerald-700' },
  fees_received:      { label: 'تم الاستلام',     color: 'bg-emerald-100 text-emerald-700' },
  rejected:           { label: 'مرفوض',           color: 'bg-red-100 text-red-700' },
};

const FUNDING_TYPES = ['نقاط بيع', 'كاش', 'إقرارات ضريبية', 'رهن', 'أسطول', 'تمويل شخصي', 'عقار', 'تمويل تجاري'];

const DOC_UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';
const ACCOUNT_STATEMENT_ACCEPT = '.xlsx,.xls';

function formatPartnerLabel(partner) {
  const name = String(partner?.name || '').trim();
  const descriptor = String(partner?.partner_type || partner?.role || '').trim();
  if (!descriptor) return name || 'بدون اسم';
  return `${name || 'بدون اسم'} (${descriptor})`;
}

function getDocumentDescription(documentName, requestMeta = {}) {
  const entityType = String(requestMeta?.entity_type || '').trim();
  const ownershipType = String(requestMeta?.ownership_type || '').trim();
  const isCompany = entityType.includes('شركة');
  const isInvestor = ['مستثمر', 'أجنبي', 'اجنبي', 'مختلط'].includes(ownershipType);

  if (documentName.includes('عقد التأسيس')) {
    return isCompany ? 'مطلوب لأن الكيان الحالي شركة.' : 'مستند يخص الشركات.';
  }

  if (documentName.includes('هوية أبشر')) {
    return isInvestor ? 'مطلوب لأن الملكية الحالية مستثمر أو أجنبية.' : 'مستند خاص بالمستثمر.';
  }

  if (documentName.includes('الترخيص الاستثماري')) {
    return isInvestor ? 'مطلوب للمنشآت الاستثمارية أو الأجنبية.' : 'مستند خاص بالمنشآت الاستثمارية.';
  }

  if (documentName.includes('صورة الهوية')) {
    return isCompany ? 'يرفق هوية جميع الشركاء أو من يلزم مع توضيح تاريخ الانتهاء.' : 'يرفق هوية المالك مع توضيح تاريخ الانتهاء.';
  }

  if (documentName.includes('العنوان الوطني')) {
    return 'يرفق عنوان المنشأة وعنوان الملاك إذا كانا في ملفات منفصلة.';
  }

  return 'مستند مطلوب ضمن ملف هذا الطلب.';
}

function repairUploadedFileName(value = '') {
  const original = String(value || '').trim();
  if (!original) return '';

  if (!/[ØÙÃÐ]/.test(original) && !original.includes('�')) {
    return original;
  }

  try {
    const bytes = Uint8Array.from(original, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder('utf-8').decode(bytes).trim();
    if (decoded && !decoded.includes('�')) return decoded;
  } catch (error) {
  }

  return original;
}

function getDocumentStatusMeta(document) {
  if (document?.status === 'expired') {
    return {
      label: 'منتهي الصلاحية',
      className: 'bg-red-100 text-red-700',
    };
  }

  if (document?.file_path) {
    return {
      label: 'مرفوع',
      className: 'bg-emerald-100 text-emerald-700',
    };
  }

  return {
    label: 'بانتظار الرفع',
    className: 'bg-amber-100 text-amber-700',
  };
}

function NamedDocumentsUploader({ documents, uploadingDocId, onUpload, getFileUrl, requestMeta }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-5 text-center text-xs text-gray-500 sm:px-4 sm:py-6 sm:text-sm">
        لا توجد قائمة مستندات لهذا الطلب حالياً.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:gap-3 xl:grid-cols-2">
      {documents.map((document) => {
        const statusMeta = getDocumentStatusMeta(document);
        const description = getDocumentDescription(document.document_name, requestMeta);
        const displayFileName = repairUploadedFileName(document.file_name || '');

        return (
          <div key={document.id} className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition-shadow hover:shadow-md sm:rounded-2xl sm:p-4">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-bold leading-5 text-gray-900 sm:text-sm sm:leading-6">{document.document_name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-2.5 sm:py-1 sm:text-[11px] ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                </div>
                <p className="mt-1 hidden text-[11px] leading-5 text-gray-600 sm:block sm:text-xs">{description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-500 sm:text-xs">
                  <span className="block max-w-full truncate">{displayFileName || 'لم يتم رفع ملف بعد'}</span>
                  {document.expiry_date && <span className="hidden sm:inline">الانتهاء: {document.expiry_date}</span>}
                  {document.file_path && getFileUrl(document.file_path) && (
                    <a href={getFileUrl(document.file_path)} target="_blank" rel="noopener noreferrer" className="hidden font-semibold text-blue-600 hover:underline sm:inline">
                      تحميل الملف الحالي
                    </a>
                  )}
                </div>
            </div>

            <label className={`mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-[10px] font-semibold transition-colors sm:mt-3 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-xs ${uploadingDocId === document.id ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              <Upload size={13} className="flex-shrink-0 sm:hidden" />
              <Upload size={14} className="hidden flex-shrink-0 sm:block" />
                <span className="sm:hidden">{uploadingDocId === document.id ? 'جارٍ الرفع...' : (document.file_path ? 'استبدال' : 'رفع')}</span>
                <span className="hidden sm:inline">{uploadingDocId === document.id ? 'جارٍ الرفع...' : (document.file_path ? 'استبدال المستند' : 'رفع المستند')}</span>
                <input
                  type="file"
                  accept={DOC_UPLOAD_ACCEPT}
                  className="hidden"
                  disabled={uploadingDocId === document.id}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUpload(document.id, file);
                    event.target.value = '';
                  }}
                />
            </label>
          </div>
        );
      })}
    </div>
  );
}

function UploadSupportCard({ title, description, files, onChange, accept, emptyLabel, accentClass = 'text-purple-600', compact = false }) {
  return (
    <div className={`border border-gray-200 bg-white ${compact ? 'rounded-lg p-2.5' : 'rounded-xl p-3 sm:rounded-2xl sm:p-4'}`}>
      <h3 className={`font-bold text-gray-800 flex items-center gap-2 ${compact ? 'mb-2 text-[12px]' : 'mb-3 text-sm'}`}>
        <Upload size={compact ? 14 : 15} className={accentClass} /> {title}
      </h3>
      <p className={`${compact ? 'mb-2 text-[10px] leading-4' : 'mb-2.5 text-[11px] sm:mb-3 sm:text-xs'} text-gray-500`}>{description}</p>
      <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors ${compact ? 'h-16 rounded-lg' : 'h-20 rounded-lg sm:h-24 sm:rounded-xl'}`}>
        <Upload size={compact ? 16 : 18} className="mb-1 text-gray-400 sm:size-5" />
        <span className={`${compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'} text-gray-500`}>{files.length > 0 ? `${files.length} ملف محدد` : emptyLabel}</span>
        <input type="file" accept={accept} multiple className="hidden" onChange={e => onChange(Array.from(e.target.files || []))} />
      </label>
      {files.length > 0 && <p className={`${compact ? 'mt-1 text-[10px]' : 'mt-1.5 text-[11px] sm:text-xs'} font-medium text-green-600`}>✓ {files.length} ملف</p>}
    </div>
  );
}

function MobileUploadAccordion({ title, countLabel, children }) {
  return (
    <details className="rounded-lg border border-gray-200 bg-white" open={countLabel !== '0 ملف'}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-[12px] font-bold text-gray-800 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{countLabel}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </span>
      </summary>
      <div className="border-t border-gray-100 p-2.5">
        {children}
      </div>
    </details>
  );
}

export default function Requests() {
  const { authFetch, user, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    const idx = filePath.indexOf('uploads/');
    if (idx !== -1) return `${API_BASE}/uploads/${filePath.slice(idx + 8)}`;
    return null;
  };
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [partners, setPartners] = useState([]);
  const [newForm, setNewForm] = useState({ company_name: '', owner_name: '', owner_phone: '', entity_type: 'شركة', ownership_type: 'سعودي', funding_type: 'نقاط بيع', referred_by_id: '' });
  const [submittingNew, setSubmittingNew] = useState(false);

  const [reviewReq, setReviewReq] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [submittingMissing, setSubmittingMissing] = useState(false);
  const [suggestedEntities, setSuggestedEntities] = useState([]);

  const [sendReq, setSendReq] = useState(null);
  const [entities, setEntities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [sendForm, setSendForm] = useState({ funding_entity_id: '', contact_id: '', note: '' });
  const [submittingSend, setSubmittingSend] = useState(false);

  const [statusDropdown, setStatusDropdown] = useState(null);
  const [statusDropdownPos, setStatusDropdownPos] = useState({ top: 0, right: 0 });

  const openStatusDropdown = (id, e) => {
    if (statusDropdown === id) { setStatusDropdown(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setStatusDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setStatusDropdown(id);
  };

  // Upload steps for new request (non-admin)
  const [newStep, setNewStep] = useState(1);
  const [newReqId, setNewReqId] = useState(null);
  const [newRequestData, setNewRequestData] = useState(null);
  const [uploadBankFiles, setUploadBankFiles] = useState([]);
  const [uploadAccountFiles, setUploadAccountFiles] = useState([]);
  const [uploadTaxFiles, setUploadTaxFiles] = useState([]);
  const [uploadingNew, setUploadingNew] = useState(false);

  // Send uploaded package to admin (non-admin)
  const [submittingPackageId, setSubmittingPackageId] = useState(null);

  // Upload files from review modal
  const [reviewBankFiles, setReviewBankFiles] = useState([]);
  const [reviewAccountFiles, setReviewAccountFiles] = useState([]);
  const [reviewTaxFiles, setReviewTaxFiles] = useState([]);
  const [uploadingReview, setUploadingReview] = useState(false);

  const resetNewFlow = () => {
    setShowNew(false);
    setNewStep(1);
    setNewReqId(null);
    setNewRequestData(null);
    setUploadBankFiles([]);
    setUploadAccountFiles([]);
    setUploadTaxFiles([]);
    setNewForm({ company_name: '', owner_name: '', owner_phone: '', entity_type: 'شركة', ownership_type: 'سعودي', funding_type: 'نقاط بيع', referred_by_id: '' });
  };

  const fetchUserRequestDetails = async (requestId) => {
    const res = await authFetch(`/api/requests/${requestId}`);
    return res.ok ? await res.json() : null;
  };

  const hasUploadedPackage = (requestLike) => {
    if (!requestLike) return false;

    const uploadedNamedDocs = Array.isArray(requestLike.documents)
      ? requestLike.documents.some((document) => document.file_path)
      : Number(requestLike.doc_valid || 0) > 0;

    const hasBankStatements = Array.isArray(requestLike.bank_statements) && requestLike.bank_statements.length > 0;
    const hasAccountStatements = Array.isArray(requestLike.account_statements) && requestLike.account_statements.length > 0;
    const hasTaxDocuments = Array.isArray(requestLike.tax_documents) && requestLike.tax_documents.length > 0;
    const hasCompleteFile = Boolean(requestLike.complete_file_path || requestLike.complete_file_name);

    return uploadedNamedDocs || hasBankStatements || hasAccountStatements || hasTaxDocuments || hasCompleteFile;
  };

  const submitRequestPackage = async (requestLike) => {
    if (!requestLike) return;
    if (!hasUploadedPackage(requestLike)) {
      alert('ارفع مستنداً واحداً على الأقل أو أضف الكشوفات والقوائم قبل الإرسال للإدارة');
      return;
    }

    setSubmittingPackageId(requestLike.id);
    const res = await authFetch(`/api/requests/${requestLike.id}/submit-file`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'تعذر إرسال الطلب للإدارة');
    } else {
      alert(data.message || 'تم إرسال الطلب للإدارة بنجاح');
      if (reviewReq && Number(reviewReq.id) === Number(requestLike.id)) {
        await reloadReview(requestLike.id);
      }
      await load();
    }
    setSubmittingPackageId(null);
  };

  const uploadRequestDocument = async ({ requestId, docId, file, refresh }) => {
    if (!requestId || !docId || !file) return;

    setUploadingDocId(docId);
    const fd = new FormData();
    fd.append('file', file);

    const res = await authFetch(`/api/requests/${requestId}/documents/${docId}/upload`, {
      method: 'POST',
      body: fd,
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'تعذر رفع المستند');
    } else if (data.status === 'expired') {
      alert(data.message || 'تم رفع المستند لكن يبدو أنه منتهي الصلاحية');
    }

    await refresh();
    await load();
    setUploadingDocId(null);
  };

  const submitReviewFiles = async () => {
    if (!reviewReq) return;
    if (reviewBankFiles.length === 0 && reviewAccountFiles.length === 0 && reviewTaxFiles.length === 0) {
      alert('اختر ملفاً واحداً على الأقل'); return;
    }
    setUploadingReview(true);
    try {
      if (reviewBankFiles.length > 0) {
        const fd = new FormData();
        reviewBankFiles.forEach(f => fd.append('files', f));
        await authFetch(`/api/requests/${reviewReq.id}/bank-statements`, { method: 'POST', body: fd });
      }
      if (reviewAccountFiles.length > 0) {
        const fd = new FormData();
        reviewAccountFiles.forEach(f => fd.append('files', f));
        await authFetch(`/api/requests/${reviewReq.id}/account-statements`, { method: 'POST', body: fd });
      }
      if (reviewTaxFiles.length > 0) {
        const fd = new FormData();
        reviewTaxFiles.forEach(f => fd.append('files', f));
        await authFetch(`/api/requests/${reviewReq.id}/tax-documents`, { method: 'POST', body: fd });
      }
      await reloadReview(reviewReq.id);
      await load();
      setReviewBankFiles([]);
      setReviewAccountFiles([]);
      setReviewTaxFiles([]);
      alert('تم رفع الملفات بنجاح');
    } catch (err) {
      alert('خطأ في رفع الملفات');
    }
    setUploadingReview(false);
  };

  // Edit request
  const [editReq, setEditReq] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const openEdit = (r) => {
    setEditReq(r);
    setEditForm({
      company_name: r.company_name || '',
      owner_name: r.owner_name || '',
      owner_phone: r.owner_phone || '',
      entity_type: r.entity_type || 'شركة',
      ownership_type: r.ownership_type || 'سعودي',
      funding_type: r.funding_type || 'نقاط بيع',
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSubmittingEdit(true);
    const res = await authFetch(`/api/requests/${editReq.id}`, { method: 'PUT', body: JSON.stringify(editForm) });
    const d = await res.json();
    if (!res.ok) alert(d.error || 'خطأ في التعديل');
    else { setEditReq(null); load(); }
    setSubmittingEdit(false);
  };

  const deleteRequest = async (r) => {
    if (!confirm(`حذف طلب “${r.company_name}” نهائياً؟`)) return;
    const res = await authFetch(`/api/requests/${r.id}`, { method: 'DELETE' });
    if (res.ok) load(); else { const d = await res.json(); alert(d.error || 'خطأ في الحذف'); }
  };

  const load = async () => {
    setLoading(true);
    const url = isAdmin ? '/api/admin/requests' : '/api/requests';
    const res = await authFetch(url);
    const data = res.ok ? await res.json() : [];
    setRequests(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = async () => {
    const res = await authFetch('/api/requests/partners-list');
    const data = res.ok ? await res.json() : [];
    setPartners(Array.isArray(data) ? data : []);
    setNewStep(1);
    setNewReqId(null);
    setNewRequestData(null);
    setUploadBankFiles([]);
    setUploadAccountFiles([]);
    setUploadTaxFiles([]);
    setShowNew(true);
  };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('new') === '1') {
      openNew();
      navigate('/requests', { replace: true });
    }
  }, [location.search]);

  useEffect(() => {
    const viewId = new URLSearchParams(location.search).get('view');
    if (!viewId || loading || reviewReq) return;
    const match = requests.find(r => String(r.id) === String(viewId));
    if (match) openReview(match);
  }, [requests, loading, location.search]);

  const createRequest = async (e) => {
    e.preventDefault();
    setSubmittingNew(true);
    const res = await authFetch('/api/requests', { method: 'POST', body: JSON.stringify(newForm) });
    const d = await res.json();
    if (!res.ok) { alert(d.error || 'خطأ'); setSubmittingNew(false); return; }
    setNewReqId(d.id);
    const detailData = await fetchUserRequestDetails(d.id);
    setNewRequestData(detailData);
    setNewStep(2);
    setSubmittingNew(false);
  };

  const submitWithFiles = async () => {
    if (!newReqId) return;
    setUploadingNew(true);
    try {
      if (uploadBankFiles.length > 0) {
        const fd = new FormData();
        uploadBankFiles.forEach(f => fd.append('files', f));
        await authFetch(`/api/requests/${newReqId}/bank-statements`, { method: 'POST', body: fd });
      }
      if (uploadAccountFiles.length > 0) {
        const fd = new FormData();
        uploadAccountFiles.forEach(f => fd.append('files', f));
        await authFetch(`/api/requests/${newReqId}/account-statements`, { method: 'POST', body: fd });
      }
      if (uploadTaxFiles.length > 0) {
        const fd = new FormData();
        uploadTaxFiles.forEach(f => fd.append('files', f));
        await authFetch(`/api/requests/${newReqId}/tax-documents`, { method: 'POST', body: fd });
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
    resetNewFlow();
    await load();
    setUploadingNew(false);
  };

  const openReview = async (req) => {
    setReviewReq(req); setLoadingReview(true); setReviewData(null);
    setSuggestedEntities([]);
    const url = isAdmin ? `/api/admin/requests/${req.id}` : `/api/requests/${req.id}`;
    const res = await authFetch(url);
    const data = res.ok ? await res.json() : null;
    setReviewData(data);
    loadChat(req.id);
    // تحديد الرسائل كمقروءة
    authFetch(`/api/requests/${req.id}/mark-read`, { method: 'POST' }).catch(() => {});
    // للأدمن فقط: جلب الجهات المقترحة عند حالة ملف مقدم
    if (isAdmin && data && ['file_submitted', 'missing_submitted'].includes(data.status) && data.total_pos > 0) {
      try {
        const er = await authFetch('/api/requests/eligibility-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            totalPos: data.total_pos || 0,
            totalDeposit: data.total_deposit || 0,
            totalTransfer: data.total_transfer || 0,
            months: data.statement_months || 12,
            fundingType: data.funding_type || 'نقاط بيع',
            bankName: '',
            recordAgeMonths: 24,
            ownershipType: data.ownership_type || 'سعودي',
            entityType: data.entity_type || 'شركة',
          })
        });
        if (er.ok) {
          const edata = await er.json();
          setSuggestedEntities(edata.entities || []);
        }
      } catch (_) {}
    }
    setLoadingReview(false);
  };

  const reloadReview = async (requestId) => {
    const url = isAdmin ? `/api/admin/requests/${requestId}` : `/api/requests/${requestId}`;
    const res = await authFetch(url);
    setReviewData(res.ok ? await res.json() : null);
  };

  const closeReview = () => {
    setReviewReq(null);
    setReviewData(null);
    setChatMessages([]);
    setChatText('');
    setSuggestedEntities([]);
    setReviewBankFiles([]);
    setReviewAccountFiles([]);
    setReviewTaxFiles([]);

    const params = new URLSearchParams(location.search);
    if (params.get('view')) {
      navigate('/requests', { replace: true });
    }
  };

  const uploadMissingDoc = async (docId, file) => {
    if (!reviewReq || !file) return;
    await uploadRequestDocument({
      requestId: reviewReq.id,
      docId,
      file,
      refresh: () => reloadReview(reviewReq.id),
    });
  };

  const submitMissingToAdmin = async () => {
    if (!reviewReq) return;
    setSubmittingMissing(true);
    const res = await authFetch(`/api/requests/${reviewReq.id}/submit-missing`, { method: 'POST' });
    const d = await res.json();
    if (!res.ok) alert(d.error || 'تعذر إرسال النواقص');
    else {
      alert(d.message || 'تم إرسال النواقص');
      await reloadReview(reviewReq.id);
      await load();
    }
    setSubmittingMissing(false);
  };

  const loadChat = async (requestId) => {
    setLoadingChat(true);
    const res = await authFetch(`/api/requests/${requestId}/messages`);
    const data = res.ok ? await res.json() : [];
    setChatMessages(Array.isArray(data) ? data : []);
    setLoadingChat(false);
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!reviewReq || !chatText.trim()) return;
    setSendingChat(true);
    const res = await authFetch(`/api/requests/${reviewReq.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message: chatText.trim() }),
    });
    const d = await res.json();
    if (!res.ok) alert(d.error || 'تعذر إرسال الرسالة');
    else {
      setChatText('');
      loadChat(reviewReq.id);
    }
    setSendingChat(false);
  };

  const openSend = async (req) => {
    setSendReq(req);
    setSendForm({ funding_entity_id: '', contact_id: '', note: '' });
    const [eRes, cRes] = await Promise.all([authFetch('/api/admin/funding-entities'), authFetch('/api/companies/contacts')]);
    setEntities(eRes.ok ? await eRes.json() : []);
    setContacts(cRes.ok ? await cRes.json() : []);
  };

  const submitSend = async (e) => {
    e.preventDefault();
    setSubmittingSend(true);
    const res = await authFetch(`/api/admin/requests/${sendReq.id}/assign-funding`, { method: 'POST', body: JSON.stringify(sendForm) });
    const d = await res.json();
    if (!res.ok) alert(d.error || 'خطأ');
    else { alert(d.message); setSendReq(null); load(); }
    setSubmittingSend(false);
  };

  const changeStatus = async (id, status) => {
    await authFetch(`/api/admin/requests/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    setStatusDropdown(null);
    load();
  };

  const filteredContacts = contacts.filter(c => String(c.funding_entity_id) === String(sendForm.funding_entity_id));

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.company_name?.toLowerCase().includes(q) || r.owner_phone?.includes(q) || r.user_name?.toLowerCase().includes(q) || r.funding_type?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const myMissingCount = !isAdmin
    ? requests.filter(r => r.status === 'missing').length
    : 0;

  const fmt = d => d ? new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const newRequestDocuments = newRequestData?.documents || [];
  const uploadedNewRequestDocuments = newRequestDocuments.filter((document) => document.file_path).length;
  const newRequestProgress = newRequestDocuments.length > 0
    ? Math.round((uploadedNewRequestDocuments / newRequestDocuments.length) * 100)
    : 0;

  return (
    <div dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">الطلبات</h1>
          <p className="text-gray-400 text-sm mt-0.5">{requests.length} طلب إجمالاً</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم المنشأة، الجوال، الموظف..." className="w-full border border-gray-200 rounded-xl py-2.5 pr-9 pl-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">كل الحالات</option>
          {Object.entries(isAdmin ? STATUS_MAP : USER_STATUS_MAP)
            .filter(([k], i, arr) => arr.findIndex(([, v]) => v.label === (isAdmin ? STATUS_MAP[k] : USER_STATUS_MAP[k])?.label) === i)
            .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {!isAdmin && myMissingCount > 0 && (
        <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-orange-800">
            <AlertTriangle size={18} />
            <span className="text-sm font-bold">لديك {myMissingCount} طلب فيه نواقص. أكمل المستندات ثم أعد إرسالها للإدارة.</span>
          </div>
          <button
            onClick={() => setFilterStatus('missing')}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
          >
            عرض النواقص
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24"><div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <FileText size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-right px-5 py-3.5 font-semibold text-gray-500 text-xs hidden sm:table-cell">#</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-gray-500 text-xs">المنشأة</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-gray-500 text-xs hidden md:table-cell">جوال المالك</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-gray-500 text-xs hidden lg:table-cell">نوع التمويل</th>
                  {isAdmin && <th className="text-right px-4 py-3.5 font-semibold text-gray-500 text-xs hidden md:table-cell">الموظف / الشريك</th>}
                  <th className="text-right px-4 py-3.5 font-semibold text-gray-500 text-xs hidden lg:table-cell">الجهة التمويلية</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-gray-500 text-xs">الحالة</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-gray-500 text-xs hidden sm:table-cell">التاريخ</th>
                  <th className="px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const st = isAdmin
                    ? (STATUS_MAP[r.status] || { label: r.status, color: 'bg-gray-100 text-gray-600' })
                    : (USER_STATUS_MAP[r.status] || { label: r.status, color: 'bg-gray-100 text-gray-600' });
                  return (
                    <tr key={r.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-5 py-4 text-gray-400 font-mono text-xs hidden sm:table-cell">{r.id}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs">{r.company_name?.[0]}</span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{r.company_name}</div>
                            <div className="text-gray-400 text-xs">{r.owner_name || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        {r.owner_phone ? (
                          <div className="flex items-center gap-1.5 text-gray-600"><Phone size={13} className="text-gray-400" /><span className="font-mono text-xs">{r.owner_phone}</span></div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">{r.funding_type}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><span className="text-green-700 font-bold" style={{ fontSize: 10 }}>{r.user_name?.[0]}</span></div>
                            <span className="text-gray-700 text-xs font-medium">{r.user_name || '—'}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-4 text-gray-500 text-xs hidden lg:table-cell">{r.funding_entity_name || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-4">
                        {isAdmin ? (
                          <div className="relative">
                            <button onClick={(e) => openStatusDropdown(r.id, e)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer hover:opacity-80 ${st.color}`}>
                              {st.label}<ChevronDown size={11} />
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${st.color}`}>{st.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-400 text-xs whitespace-nowrap hidden sm:table-cell">{fmt(r.created_at)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => openReview(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100">
                            <Eye size={13} /> مراجعة
                          </button>
                          {(isAdmin || r.user_id === user?.id) && (
                            <button onClick={() => openEdit(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-100">
                              <Edit2 size={13} /> تحديث
                            </button>
                          )}
                          {isAdmin ? (
                            <button onClick={() => openSend(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100">
                              <Send size={13} /> إرسال
                            </button>
                          ) : (
                            <button
                              onClick={() => submitRequestPackage(r)}
                              disabled={submittingPackageId === r.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 disabled:opacity-50"
                            >
                              <Send size={13} /> {submittingPackageId === r.id ? 'جارٍ الإرسال...' : 'إرسال للإدارة'}
                            </button>
                          )}
                          {!isAdmin && r.status === 'missing' && (
                            <button onClick={() => openReview(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold hover:bg-orange-200">
                              <AlertTriangle size={13} /> إكمال النواقص
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => deleteRequest(r)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Dropdown Portal (fixed position) */}
      {statusDropdown && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setStatusDropdown(null)} />
          <div
            className="fixed z-[100] bg-white border border-gray-200 rounded-xl shadow-2xl py-1 min-w-[180px] max-h-64 overflow-y-auto"
            style={{ top: statusDropdownPos.top, right: statusDropdownPos.right }}
            dir="rtl"
          >
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <button key={k} onClick={() => changeStatus(statusDropdown, k)} className={`w-full text-right px-4 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${k === requests.find(r => r.id === statusDropdown)?.status ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${v.color.split(' ')[0]}`} />{v.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* New Request Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto" dir="rtl">
          <div className={`bg-white rounded-2xl shadow-2xl w-full mx-3 my-4 sm:mx-4 sm:my-8 ${newStep === 1 ? 'max-w-2xl p-4 sm:p-6' : 'max-w-2xl overflow-hidden xl:max-w-5xl'}`}>
            {newStep === 1 ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-black text-gray-900">طلب جديد</h2>
                    {!isAdmin && <p className="text-xs text-gray-400 mt-0.5">الخطوة 1 من 2 — بيانات المنشأة</p>}
                  </div>
                  <button onClick={resetNewFlow} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <form onSubmit={createRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">اسم المنشأة *</label>
                    <input required value={newForm.company_name} onChange={e => setNewForm({ ...newForm, company_name: e.target.value })} className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">اسم المالك</label>
                      <input value={newForm.owner_name} onChange={e => setNewForm({ ...newForm, owner_name: e.target.value })} className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">جوال المالك</label>
                      <input value={newForm.owner_phone} onChange={e => setNewForm({ ...newForm, owner_phone: e.target.value })} className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="05xxxxxxxx" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">نوع الكيان</label>
                      <select value={newForm.entity_type} onChange={e => setNewForm({ ...newForm, entity_type: e.target.value })} className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {['شركة', 'مؤسسة', 'شخص واحد', 'جمعية', 'حكومي'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">الجنسية</label>
                      <select value={newForm.ownership_type} onChange={e => setNewForm({ ...newForm, ownership_type: e.target.value })} className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {['سعودي', 'مختلط', 'مستثمر'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">نوع التمويل</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {FUNDING_TYPES.map(t => (
                        <button key={t} type="button" onClick={() => setNewForm({ ...newForm, funding_type: t })} className={`px-2 py-2 rounded-lg text-xs font-medium text-center transition-colors ${newForm.funding_type === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  {isAdmin && partners.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">الموظف / الشريك</label>
                      <select value={newForm.referred_by_id} onChange={e => setNewForm({ ...newForm, referred_by_id: e.target.value })} className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">اختر...</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{formatPartnerLabel(p)}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                    <button type="submit" disabled={submittingNew} className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-60" style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
                      {submittingNew ? 'جارٍ الحفظ...' : 'التالي ←'}
                    </button>
                    <button type="button" onClick={resetNewFlow} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 sm:w-auto">إلغاء</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4 xl:border-b-0 xl:px-0 xl:py-0">
                  <div className="rounded-2xl border border-blue-100 bg-gradient-to-l from-slate-50 via-white to-blue-50 p-3 sm:rounded-3xl sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700 sm:px-3 sm:text-[11px]">
                        الخطوة 2 من 2
                      </div>
                      <h2 className="mt-2 text-base font-black text-gray-900 sm:mt-3 sm:text-xl">رفع المستندات والمرفقات</h2>
                      <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-sm sm:leading-6">ارفع المستندات الأساسية ثم الكشوفات والقوائم، وبعدها احفظ المرفقات من نفس النافذة.</p>
                    </div>
                    <div className="flex items-center gap-3 self-start">
                      <div className="min-w-[116px] rounded-xl bg-white/90 px-2.5 py-2 shadow-sm ring-1 ring-blue-100 sm:min-w-[180px] sm:rounded-2xl sm:px-4 sm:py-3">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>اكتمال المستندات</span>
                          <span className="font-bold text-blue-700">{uploadedNewRequestDocuments}/{newRequestDocuments.length || 0}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all" style={{ width: `${newRequestProgress}%` }} />
                        </div>
                      </div>
                      <button onClick={resetNewFlow} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>
                  </div>
                </div>
                </div>
                <div className="max-h-[75vh] overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 xl:max-h-[82vh] xl:px-0 xl:py-0">
                <div className="grid gap-3 sm:gap-4 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
                  <div className="order-2 hidden space-y-3 xl:order-1 xl:block xl:max-h-[68vh] xl:overflow-y-auto xl:pr-1">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 sm:rounded-3xl sm:p-4">
                      <h3 className="font-bold text-emerald-900 text-sm">ترتيب الرفع</h3>
                      <div className="mt-2.5 space-y-2 text-[11px] text-emerald-900/80 sm:mt-3 sm:text-xs">
                        <div className="rounded-xl bg-white/80 px-3 py-2 sm:rounded-2xl">1. ارفع المستندات الأساسية من القائمة المقابلة.</div>
                        <div className="rounded-xl bg-white/80 px-3 py-2 sm:rounded-2xl">2. أضف كشوف الحساب PDF وExcel لآخر 12 شهر.</div>
                        <div className="rounded-xl bg-white/80 px-3 py-2 sm:rounded-2xl">3. أرفق القوائم المالية ثم احفظ المرفقات.</div>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-3 bg-white sm:rounded-2xl sm:p-4">
                      <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                        <Upload size={15} className="text-purple-600" /> كشوف الحساب PDF
                      </h3>
                      <p className="mb-2.5 text-[11px] text-gray-500 sm:mb-3 sm:text-xs">آخر 12 شهر بصيغة PDF أو صورة واضحة.</p>
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors sm:h-24 sm:rounded-xl">
                        <Upload size={18} className="text-gray-400 mb-1 sm:size-5" />
                        <span className="text-[11px] text-gray-500 sm:text-xs">{uploadBankFiles.length > 0 ? `${uploadBankFiles.length} ملف محدد` : 'اضغط لاختيار ملفات متعددة'}</span>
                        <input type="file" accept={DOC_UPLOAD_ACCEPT} multiple className="hidden" onChange={e => setUploadBankFiles(Array.from(e.target.files || []))} />
                      </label>
                      {uploadBankFiles.length > 0 && <p className="mt-1.5 text-[11px] font-medium text-green-600 sm:text-xs">✓ {uploadBankFiles.length} ملف</p>}
                    </div>
                    <div className="border border-gray-200 rounded-xl p-3 bg-white sm:rounded-2xl sm:p-4">
                      <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                        <Upload size={15} className="text-indigo-600" /> كشوف الحساب Excel
                      </h3>
                      <p className="mb-2.5 text-[11px] text-gray-500 sm:mb-3 sm:text-xs">ارفع ملف Excel أو XLS لآخر 12 شهر.</p>
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors sm:h-24 sm:rounded-xl">
                        <Upload size={18} className="text-gray-400 mb-1 sm:size-5" />
                        <span className="text-[11px] text-gray-500 sm:text-xs">{uploadAccountFiles.length > 0 ? `${uploadAccountFiles.length} ملف محدد` : 'اضغط لاختيار ملفات Excel'}</span>
                        <input type="file" accept={ACCOUNT_STATEMENT_ACCEPT} multiple className="hidden" onChange={e => setUploadAccountFiles(Array.from(e.target.files || []))} />
                      </label>
                      {uploadAccountFiles.length > 0 && <p className="mt-1.5 text-[11px] font-medium text-green-600 sm:text-xs">✓ {uploadAccountFiles.length} ملف</p>}
                    </div>
                    <div className="border border-gray-200 rounded-xl p-3 bg-white sm:rounded-2xl sm:p-4">
                      <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                        <Upload size={15} className="text-emerald-600" /> قوائم مالية وإقرارات
                      </h3>
                      <p className="mb-2.5 text-[11px] leading-5 text-gray-500 sm:mb-3 sm:text-xs">تشمل القوائم المالية والإقرارات الضريبية: آخر 6 فترات ربعية أو آخر 15 فترة شهرية حسب نوع الإقرار.</p>
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors sm:h-24 sm:rounded-xl">
                        <Upload size={18} className="text-gray-400 mb-1 sm:size-5" />
                        <span className="text-[11px] text-gray-500 sm:text-xs">{uploadTaxFiles.length > 0 ? `${uploadTaxFiles.length} ملف محدد` : 'اضغط لاختيار ملفات متعددة'}</span>
                        <input type="file" accept={DOC_UPLOAD_ACCEPT} multiple className="hidden" onChange={e => setUploadTaxFiles(Array.from(e.target.files || []))} />
                      </label>
                      {uploadTaxFiles.length > 0 && <p className="mt-1.5 text-[11px] font-medium text-green-600 sm:text-xs">✓ {uploadTaxFiles.length} ملف</p>}
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-slate-50 p-3 sm:rounded-3xl sm:p-4 xl:sticky xl:bottom-0">
                      <div className="flex items-start gap-2 text-[11px] text-gray-500 sm:text-xs">
                        <AlertTriangle size={14} className="mt-0.5 text-amber-500" />
                        <p>يمكنك حفظ المرفقات الآن واستكمال أي مستند لاحقًا من شاشة الطلب نفسها دون الرجوع لبداية الخطوات.</p>
                      </div>
                      <button
                        onClick={submitWithFiles}
                        disabled={uploadingNew}
                        className="mt-3 w-full px-6 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 sm:mt-4 sm:px-12 sm:py-3"
                        style={{ background: 'linear-gradient(90deg, #065f46, #059669)' }}
                      >
                        <Send size={16} />{uploadingNew ? 'جارٍ الحفظ...' : 'حفظ المرفقات'}
                      </button>
                    </div>
                  </div>
                  <div className="order-1 min-w-0 rounded-2xl border border-gray-200 bg-slate-50/80 p-2.5 sm:rounded-3xl sm:p-4 xl:order-2">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                          <Upload size={15} className="text-blue-600" /> المستندات الأساسية
                        </h3>
                        <p className="mt-1 hidden text-[11px] leading-5 text-gray-500 sm:block sm:text-xs">كل مستند في بطاقة صغيرة مستقلة، والرفع أو الاستبدال يتم من نفس البطاقة.</p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700 sm:px-3 sm:text-[11px]">
                        {uploadedNewRequestDocuments} / {newRequestDocuments.length}
                      </span>
                    </div>
                    <div className="max-h-none overflow-visible pr-0 sm:max-h-[52vh] sm:overflow-y-auto sm:pr-1 xl:max-h-[68vh]">
                      <NamedDocumentsUploader
                        documents={newRequestDocuments}
                        uploadingDocId={uploadingDocId}
                        onUpload={(docId, file) => uploadRequestDocument({
                          requestId: newReqId,
                          docId,
                          file,
                          refresh: async () => {
                            const detailData = await fetchUserRequestDetails(newReqId);
                            setNewRequestData(detailData);
                          },
                        })}
                        getFileUrl={getFileUrl}
                        requestMeta={newRequestData || newForm}
                      />
                    </div>
                  </div>
                  <div className="order-2 space-y-2.5 xl:hidden">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                      <h3 className="font-bold text-emerald-900 text-[12px]">ترتيب الرفع</h3>
                      <div className="mt-2 space-y-1.5 text-[10px] text-emerald-900/80">
                        <div className="rounded-lg bg-white/80 px-2.5 py-2">1. ارفع المستندات الأساسية.</div>
                        <div className="rounded-lg bg-white/80 px-2.5 py-2">2. أضف كشوف PDF وExcel.</div>
                        <div className="rounded-lg bg-white/80 px-2.5 py-2">3. أرفق القوائم ثم احفظ.</div>
                      </div>
                    </div>

                    <MobileUploadAccordion title="كشوف الحساب PDF" countLabel={`${uploadBankFiles.length} ملف`}>
                      <UploadSupportCard
                        title="كشوف الحساب PDF"
                        description="آخر 12 شهر بصيغة PDF أو صورة واضحة."
                        files={uploadBankFiles}
                        onChange={setUploadBankFiles}
                        accept={DOC_UPLOAD_ACCEPT}
                        emptyLabel="اضغط لاختيار ملفات متعددة"
                        accentClass="text-purple-600"
                        compact
                      />
                    </MobileUploadAccordion>

                    <MobileUploadAccordion title="كشوف الحساب Excel" countLabel={`${uploadAccountFiles.length} ملف`}>
                      <UploadSupportCard
                        title="كشوف الحساب Excel"
                        description="ارفع ملف Excel أو XLS لآخر 12 شهر."
                        files={uploadAccountFiles}
                        onChange={setUploadAccountFiles}
                        accept={ACCOUNT_STATEMENT_ACCEPT}
                        emptyLabel="اضغط لاختيار ملفات Excel"
                        accentClass="text-indigo-600"
                        compact
                      />
                    </MobileUploadAccordion>

                    <MobileUploadAccordion title="قوائم مالية وإقرارات" countLabel={`${uploadTaxFiles.length} ملف`}>
                      <UploadSupportCard
                        title="قوائم مالية وإقرارات"
                        description="آخر 6 فترات ربعية أو 15 فترة شهرية حسب نوع الإقرار."
                        files={uploadTaxFiles}
                        onChange={setUploadTaxFiles}
                        accept={DOC_UPLOAD_ACCEPT}
                        emptyLabel="اضغط لاختيار ملفات متعددة"
                        accentClass="text-emerald-600"
                        compact
                      />
                    </MobileUploadAccordion>

                    <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
                      <div className="flex items-start gap-2 text-[10px] text-gray-500">
                        <AlertTriangle size={13} className="mt-0.5 text-amber-500" />
                        <p>يمكنك حفظ المرفقات الآن واستكمال الباقي لاحقًا من نفس الطلب.</p>
                      </div>
                      <button
                        onClick={submitWithFiles}
                        disabled={uploadingNew}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
                        style={{ background: 'linear-gradient(90deg, #065f46, #059669)' }}
                      >
                        <Send size={16} />{uploadingNew ? 'جارٍ الحفظ...' : 'حفظ المرفقات'}
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-gray-900">{reviewReq.company_name}</h2>
                <p className="text-gray-400 text-xs mt-0.5">طلب رقم #{reviewReq.id}</p>
              </div>
              <button onClick={closeReview} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
            </div>
            {loadingReview ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : reviewData ? (
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Building2, label: 'نوع الكيان', val: reviewData.entity_type },
                    { icon: User, label: 'اسم المالك', val: reviewData.owner_name },
                    { icon: Phone, label: 'جوال المالك', val: reviewData.owner_phone },
                    { icon: FileText, label: 'نوع التمويل', val: reviewData.funding_type },
                    { icon: User, label: 'رفع بواسطة', val: reviewData.user_name },
                    { icon: Building2, label: 'الجهة التمويلية', val: reviewData.funding_entity_name || 'لم تحدد' },
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5"><Icon size={14} className="text-blue-600" /></div>
                      <div><div className="text-xs text-gray-400">{label}</div><div className="font-semibold text-gray-800 text-sm">{val || '—'}</div></div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">الحالة:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${(STATUS_MAP[reviewData.status] || {}).color || 'bg-gray-100 text-gray-600'}`}>
                    {(STATUS_MAP[reviewData.status] || {}).label || reviewData.status}
                  </span>
                </div>
                {reviewData.bank_statements?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-700 text-sm mb-2">الكشوفات البنكية ({reviewData.bank_statements.length})</h3>
                    <div className="space-y-2">
                      {reviewData.bank_statements.map(b => (
                        <div key={b.id} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-2.5 gap-2">
                          <span className="text-sm text-gray-700 font-medium truncate">{b.file_name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {b.period_label && <span className="text-xs text-gray-400">{b.period_label}</span>}
                            {getFileUrl(b.file_path) && (
                              <a href={getFileUrl(b.file_path)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-semibold">تحميل</a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {reviewData.account_statements?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-700 text-sm mb-2">كشوف الحساب ({reviewData.account_statements.length})</h3>
                    <div className="space-y-2">
                      {reviewData.account_statements.map(a => (
                        <div key={a.id} className="flex items-center justify-between bg-purple-50 rounded-xl px-4 py-2.5 gap-2">
                          <span className="text-sm text-gray-700 font-medium truncate">{a.file_name}</span>
                          {getFileUrl(a.file_path) && (
                            <a href={getFileUrl(a.file_path)} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline font-semibold flex-shrink-0">تحميل</a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {reviewData.tax_documents?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-700 text-sm mb-2">القوائم المالية والإقرارات ({reviewData.tax_documents.length})</h3>
                    <div className="space-y-2">
                      {reviewData.tax_documents.map(t => (
                        <div key={t.id} className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-2.5 gap-2">
                          <span className="text-sm text-gray-700 font-medium truncate">{t.file_name}</span>
                          {getFileUrl(t.file_path) && (
                            <a href={getFileUrl(t.file_path)} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline font-semibold flex-shrink-0">تحميل</a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {reviewData.documents?.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-bold text-gray-700 text-sm">المستندات المطلوبة ({reviewData.documents.length})</h3>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-700">
                        {reviewData.documents.filter((document) => document.file_path).length} / {reviewData.documents.length}
                      </span>
                    </div>
                    <NamedDocumentsUploader
                      documents={reviewData.documents}
                      uploadingDocId={uploadingDocId}
                      onUpload={uploadMissingDoc}
                      getFileUrl={getFileUrl}
                      requestMeta={reviewData}
                    />
                  </div>
                )}
                {(reviewData.complete_file_name || reviewData.complete_file_path) && (
                  <div>
                    <h3 className="font-bold text-gray-700 text-sm mb-2">الملف الكامل</h3>
                    <div className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-2.5 gap-2">
                      <span className="text-sm text-gray-700 font-medium truncate">{reviewData.complete_file_name || 'ملف مرفق'}</span>
                      {getFileUrl(reviewData.complete_file_path) && (
                        <a href={getFileUrl(reviewData.complete_file_path)} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline font-semibold flex-shrink-0">تحميل</a>
                      )}
                    </div>
                  </div>
                )}

                {/* قسم رفع الملفات للموظف/الشريك */}
                {!isAdmin && reviewData.status !== 'rejected' && (
                  <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/60">
                    <h3 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2">
                      <Upload size={15} className="text-blue-600" /> رفع الكشوفات والقوائم
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">كشوف الحساب PDF</label>
                        <label className="flex items-center gap-2 w-full border border-dashed border-gray-300 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white transition-colors">
                          <Upload size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500 truncate">{reviewBankFiles.length > 0 ? `${reviewBankFiles.length} ملف محدد` : 'اختر ملفات PDF أو صور'}</span>
                          <input type="file" accept={DOC_UPLOAD_ACCEPT} multiple className="hidden" onChange={e => setReviewBankFiles(Array.from(e.target.files || []))} />
                        </label>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">كشوف الحساب Excel</label>
                        <label className="flex items-center gap-2 w-full border border-dashed border-gray-300 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white transition-colors">
                          <Upload size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500 truncate">{reviewAccountFiles.length > 0 ? `${reviewAccountFiles.length} ملف محدد` : 'اختر ملفات Excel'}</span>
                          <input type="file" accept={ACCOUNT_STATEMENT_ACCEPT} multiple className="hidden" onChange={e => setReviewAccountFiles(Array.from(e.target.files || []))} />
                        </label>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">قوائم مالية وإقرارات</label>
                        <label className="flex items-center gap-2 w-full border border-dashed border-gray-300 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white transition-colors">
                          <Upload size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500 truncate">{reviewTaxFiles.length > 0 ? `${reviewTaxFiles.length} ملف محدد` : 'اختر ملفات متعددة'}</span>
                          <input type="file" accept={DOC_UPLOAD_ACCEPT} multiple className="hidden" onChange={e => setReviewTaxFiles(Array.from(e.target.files || []))} />
                        </label>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          onClick={submitReviewFiles}
                          disabled={uploadingReview}
                          className="w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                          style={{ background: 'linear-gradient(90deg, #065f46, #059669)' }}
                        >
                          <Upload size={14} />{uploadingReview ? 'جارٍ الرفع...' : 'حفظ المرفقات'}
                        </button>
                        <button
                          onClick={() => submitRequestPackage(reviewData)}
                          disabled={submittingPackageId === reviewData.id}
                          className="w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                        >
                          <Send size={14} />{submittingPackageId === reviewData.id ? 'جارٍ الإرسال...' : 'إرسال للإدارة'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* الجهات المقترحة — للأدمن فقط عند file_submitted / missing_submitted */}
                {isAdmin && suggestedEntities.length > 0 && ['file_submitted', 'missing_submitted'].includes(reviewData.status) && (
                  <div className="border border-blue-200 rounded-xl p-4 bg-blue-50">
                    <h3 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2">
                      <Building2 size={15} className="text-blue-600" />
                      الجهات التمويلية المناسبة بناءً على التحليل
                    </h3>
                    <div className="space-y-2">
                      {suggestedEntities.map(e => (
                        <div key={e.id} className="bg-white border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{e.name}</p>
                            {e.notes && <p className="text-xs text-gray-500 mt-0.5">{e.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {reviewData.status_history?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-700 text-sm mb-2">سجل الحالات</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {reviewData.status_history.map((h, i) => (
                        <div key={i} className="flex items-start gap-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                          <div>
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${(STATUS_MAP[h.status] || {}).color || 'bg-gray-100 text-gray-600'}`}>{(STATUS_MAP[h.status] || {}).label || h.status}</span>
                            {h.note && <span className="text-gray-500 mr-2">{h.note}</span>}
                            <div className="text-gray-400 mt-0.5">{h.created_by_name} · {fmt(h.created_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isAdmin && reviewData.status === 'missing' && (
                  <div className="border border-orange-200 rounded-xl p-4 bg-orange-50">
                    <h3 className="font-bold text-orange-800 text-sm mb-3">النواقص المطلوبة</h3>
                    {!reviewData.documents || reviewData.documents.length === 0 ? (
                      <p className="text-sm text-orange-700">لا توجد قائمة نواقص مرفقة لهذا الطلب.</p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-orange-700">استخدم قائمة المستندات أعلاه لرفع كل نواقص الطلب، ثم أعد الإرسال للإدارة بعد اكتمال البنود المطلوبة.</p>
                        <button
                          onClick={submitMissingToAdmin}
                          disabled={submittingMissing || !reviewData.documents.some(d => d.file_path)}
                          className="w-full py-2.5 rounded-xl text-white font-bold text-sm bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                        >
                          {submittingMissing ? 'جارٍ الإرسال...' : 'إعادة إرسال النواقص للإدارة'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="border border-gray-200 rounded-xl p-4 bg-white">
                  <h3 className="font-bold text-gray-800 text-sm mb-3">الدردشة الداخلية (الأدمن والموظف)</h3>
                  {loadingChat ? (
                    <div className="text-sm text-gray-600 py-4">جاري تحميل الرسائل...</div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto bg-gray-50 rounded-xl p-3">
                      {chatMessages.length === 0 ? (
                        <p className="text-sm text-gray-600">لا توجد رسائل بعد</p>
                      ) : chatMessages.map(m => {
                        const mine = Number(m.sender_id) === Number(user?.id);
                        return (
                          <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-xl px-3 py-2 ${mine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                              <div className={`text-xs mb-1 ${mine ? 'text-blue-100' : 'text-gray-500'}`}>
                                {m.sender_name} · {fmt(m.created_at)}
                              </div>
                              <div className="text-sm leading-6 whitespace-pre-wrap">{m.message}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <form onSubmit={sendChat} className="mt-3 flex gap-2">
                    <input
                      value={chatText}
                      onChange={e => setChatText(e.target.value)}
                      placeholder="اكتب رسالة..."
                      className="flex-1 border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={sendingChat || !chatText.trim()}
                      className="px-4 py-2.5 rounded-xl text-white text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                    >
                      {sendingChat ? 'جارٍ...' : 'إرسال'}
                    </button>
                  </form>
                </div>
              </div>
            ) : <div className="text-center py-12 text-gray-400">تعذر تحميل البيانات</div>}
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {editReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 my-8 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">تعديل الطلب #{editReq.id}</h2>
              <button onClick={() => setEditReq(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={submitEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">اسم المنشأة *</label>
                <input required value={editForm.company_name} onChange={e => setEditForm({ ...editForm, company_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">اسم المالك</label>
                  <input value={editForm.owner_name} onChange={e => setEditForm({ ...editForm, owner_name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">جوال المالك</label>
                  <input value={editForm.owner_phone} onChange={e => setEditForm({ ...editForm, owner_phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="05xxxxxxxx" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">نوع الكيان</label>
                  <select value={editForm.entity_type} onChange={e => setEditForm({ ...editForm, entity_type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['شركة', 'مؤسسة', 'شخص واحد', 'جمعية', 'حكومي'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">الجنسية</label>
                  <select value={editForm.ownership_type} onChange={e => setEditForm({ ...editForm, ownership_type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['سعودي', 'غير سعودي', 'مشترك'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">نوع التمويل</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FUNDING_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setEditForm({ ...editForm, funding_type: t })}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium text-center transition-colors ${editForm.funding_type === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submittingEdit} className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-60" style={{ background: 'linear-gradient(90deg, #92400e, #d97706)' }}>
                  {submittingEdit ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button type="button" onClick={() => setEditReq(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send to Funding Modal */}
      {sendReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-gray-900">إرسال للجهة التمويلية</h2>
                <p className="text-blue-600 text-xs font-medium mt-0.5">{sendReq.company_name}</p>
              </div>
              <button onClick={() => setSendReq(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={submitSend} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الجهة التمويلية *</label>
                <select required value={sendForm.funding_entity_id} onChange={e => setSendForm({ ...sendForm, funding_entity_id: e.target.value, contact_id: '' })}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">اختر الجهة...</option>
                  {entities.filter(e => e.is_active).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              {sendForm.funding_entity_id && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">المسؤول في الجهة</label>
                  {filteredContacts.length > 0 ? (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      <label className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                        <input type="radio" name="contact" value="" checked={!sendForm.contact_id} onChange={() => setSendForm({ ...sendForm, contact_id: '' })} className="accent-blue-600" />
                        <span className="text-sm text-gray-500">بدون تحديد مسؤول</span>
                      </label>
                      {filteredContacts.map(c => (
                        <label key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors">
                          <input type="radio" name="contact" value={c.id} checked={String(sendForm.contact_id) === String(c.id)} onChange={() => setSendForm({ ...sendForm, contact_id: String(c.id) })} className="accent-blue-600" />
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-700 font-bold text-xs">{c.name?.[0]}</span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 text-sm">{c.name}</div>
                            {c.phone && <div className="text-gray-400 text-xs">{c.phone}</div>}
                            {c.product_types?.length > 0 && <div className="text-blue-500 text-xs">{c.product_types.join(' · ')}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">لا يوجد موظفون مضافون لهذه الجهة</div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ملاحظة (اختياري)</label>
                <textarea value={sendForm.note} onChange={e => setSendForm({ ...sendForm, note: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submittingSend || !sendForm.funding_entity_id} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(90deg, #065f46, #059669)' }}>
                  <Send size={15} />{submittingSend ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
                </button>
                <button type="button" onClick={() => setSendReq(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
