const db = require('../database');

const COMMON_REQUEST_DOCUMENTS = [
  'صورة السجل التجاري',
  'صورة الهوية للمالك أو الشركاء مع تاريخ الانتهاء',
  'شهادة بلدي',
  'شهادة التأمينات',
  'شهادة الزكاة والدخل',
  'شهادة الضريبة المضافة',
  'عقد إيجار المنشأة',
  'العنوان الوطني للمنشأة والملاك',
  'موقع المنشأة من Google',
  'شهادة الآيبان بالباركود',
];

const COMPANY_ONLY_DOCUMENTS = [
  'عقد التأسيس',
];

const INVESTOR_ONLY_DOCUMENTS = [
  'هوية أبشر للمستثمر مع تاريخ الانتهاء',
  'الترخيص الاستثماري',
];

const PERSONAL_FINANCING_DOCUMENTS = [
  'صورة الهوية',
  'تعريف بالراتب',
  'كشف حساب آخر 3 أشهر',
];

const TAX_RETURN_DOCUMENTS = [
  'الإقرارات الضريبية المتاحة',
  'القوائم المالية إن وجدت',
];

const REAL_ESTATE_COMMON_DOCUMENTS = [
  'صورة الهوية',
  'بيانات العقار أو عرض السعر',
  'إثبات الدفعة الأولى إن وجدت',
];

const MORTGAGE_COMMON_DOCUMENTS = [
  'صورة الهوية',
  'صك العقار أو بيانات الرهن',
  'تفاصيل الالتزامات الحالية',
];

const EMPLOYEE_INCOME_DOCUMENTS = [
  'تعريف بالراتب أو شهادة الأجر',
  'كشف حساب آخر 3 أشهر',
];

const INDIVIDUAL_INCOME_DOCUMENTS = [
  'إثبات الدخل أو الملاءة',
  'كشف حساب آخر 3 أشهر',
];

const BUSINESS_OWNER_SUPPORT_DOCUMENTS = [
  'مستندات دخل المنشأة',
  'نبذة مختصرة عن النشاط',
];

function normalizeDocumentName(value = '') {
  return String(value).trim().toLowerCase();
}

function parseDocumentCollection(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function isInvestorOwnership(ownershipType = '') {
  return ['مستثمر', 'مختلط', 'أجنبي', 'اجنبي'].includes(String(ownershipType).trim());
}

function isCompanyEntity(entityType = '') {
  return String(entityType).trim().includes('شركة');
}

function parseProductDetails(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function normalizeApplicantCategory(value = '') {
  const rawValue = String(value || '').trim();
  if (['مالك منشأة', 'صاحب منشأة', 'منشأة'].includes(rawValue)) return 'مالك منشأة';
  if (['موظف', 'موظفة'].includes(rawValue)) return 'موظف';
  if (['فرد', 'فردي', 'فرد مستقل'].includes(rawValue)) return 'فرد';
  return rawValue;
}

function isBusinessApplicant(requestMeta = {}, productDetails = {}) {
  const fundingType = String(requestMeta.funding_type || '').trim();
  if (['نقاط بيع', 'كاش', 'إقرارات ضريبية', 'أسطول', 'تمويل تجاري'].includes(fundingType)) {
    return true;
  }

  const applicantCategory = normalizeApplicantCategory(productDetails.applicant_category);
  return applicantCategory === 'مالك منشأة';
}

function getProductSpecificDocuments(requestMeta = {}, productDetails = {}) {
  const fundingType = String(requestMeta.funding_type || '').trim();
  const applicantCategory = normalizeApplicantCategory(productDetails.applicant_category);

  if (fundingType === 'تمويل شخصي') {
    return PERSONAL_FINANCING_DOCUMENTS;
  }

  if (fundingType === 'إقرارات ضريبية') {
    return TAX_RETURN_DOCUMENTS;
  }

  if (fundingType === 'عقار') {
    if (applicantCategory === 'مالك منشأة') {
      return [...REAL_ESTATE_COMMON_DOCUMENTS, ...BUSINESS_OWNER_SUPPORT_DOCUMENTS];
    }
    if (applicantCategory === 'فرد') {
      return [...REAL_ESTATE_COMMON_DOCUMENTS, ...INDIVIDUAL_INCOME_DOCUMENTS];
    }
    return [...REAL_ESTATE_COMMON_DOCUMENTS, ...EMPLOYEE_INCOME_DOCUMENTS];
  }

  if (fundingType === 'رهن') {
    if (applicantCategory === 'مالك منشأة') {
      return [...MORTGAGE_COMMON_DOCUMENTS, ...BUSINESS_OWNER_SUPPORT_DOCUMENTS];
    }
    if (applicantCategory === 'فرد') {
      return [...MORTGAGE_COMMON_DOCUMENTS, ...INDIVIDUAL_INCOME_DOCUMENTS];
    }
    return [...MORTGAGE_COMMON_DOCUMENTS, ...EMPLOYEE_INCOME_DOCUMENTS];
  }

  return [];
}

function buildRequiredRequestDocuments(requestMeta = {}, extraDocuments = []) {
  const productDetails = parseProductDetails(requestMeta.product_details);
  const requiredDocuments = isBusinessApplicant(requestMeta, productDetails)
    ? [...COMMON_REQUEST_DOCUMENTS]
    : [];

  if (requiredDocuments.length > 0 && isCompanyEntity(requestMeta.entity_type)) {
    requiredDocuments.push(...COMPANY_ONLY_DOCUMENTS);
  }

  if (requiredDocuments.length > 0 && isInvestorOwnership(requestMeta.ownership_type)) {
    requiredDocuments.push(...INVESTOR_ONLY_DOCUMENTS);
  }

  return uniqueDocumentNames([
    ...requiredDocuments,
    ...getProductSpecificDocuments(requestMeta, productDetails),
    ...parseDocumentCollection(requestMeta.fe_required_docs),
    ...parseDocumentCollection(extraDocuments),
  ]);
}

function uniqueDocumentNames(documentNames = []) {
  const seen = new Set();
  const unique = [];

  for (const item of documentNames) {
    const name = String(item || '').trim();
    if (!name) continue;

    const normalized = normalizeDocumentName(name);
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    unique.push(name);
  }

  return unique;
}

async function ensureRequestDocuments(requestId, requestMeta = {}, extraDocuments = []) {
  if (Array.isArray(requestMeta)) {
    extraDocuments = requestMeta;
    requestMeta = {};
  }

  const requiredDocuments = buildRequiredRequestDocuments(requestMeta, extraDocuments);
  const requiredNames = new Set(requiredDocuments.map(normalizeDocumentName));

  const existingDocuments = await db.prepare(
    'SELECT id, document_name FROM request_documents WHERE request_id = ? ORDER BY id'
  ).all(requestId);

  const existingNames = new Set(
    existingDocuments.map((document) => normalizeDocumentName(document.document_name))
  );

  for (const documentName of requiredDocuments) {
    if (existingNames.has(normalizeDocumentName(documentName))) continue;

    await db.prepare(
      "INSERT INTO request_documents (request_id, document_name, status) VALUES (?, ?, 'missing')"
    ).run(requestId, documentName);
  }

  for (const existingDocument of existingDocuments) {
    if (requiredNames.has(normalizeDocumentName(existingDocument.document_name))) continue;

    await db.prepare('DELETE FROM request_documents WHERE id = ?').run(existingDocument.id);
  }

  return db.prepare('SELECT * FROM request_documents WHERE request_id = ? ORDER BY id').all(requestId);
}

module.exports = {
  COMMON_REQUEST_DOCUMENTS,
  buildRequiredRequestDocuments,
  ensureRequestDocuments,
  uniqueDocumentNames,
};