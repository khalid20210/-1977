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

function buildRequiredRequestDocuments(requestMeta = {}, extraDocuments = []) {
  const requiredDocuments = [...COMMON_REQUEST_DOCUMENTS];

  if (isCompanyEntity(requestMeta.entity_type)) {
    requiredDocuments.push(...COMPANY_ONLY_DOCUMENTS);
  }

  if (isInvestorOwnership(requestMeta.ownership_type)) {
    requiredDocuments.push(...INVESTOR_ONLY_DOCUMENTS);
  }

  return uniqueDocumentNames([
    ...requiredDocuments,
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