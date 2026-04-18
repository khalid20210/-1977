const db = require('../database');

const STANDARD_REQUEST_DOCUMENTS = [
  'صورة السجل التجاري',
  'عقد التأسيس (إن كانت المنشأة شركة)',
  'صورة الهوية للمالك أو الشركاء مع تاريخ الانتهاء',
  'هوية أبشر للمستثمر مع تاريخ الانتهاء',
  'الترخيص الاستثماري (إذا كانت الشركة أجنبية)',
  'شهادة بلدي',
  'شهادة التأمينات',
  'شهادة الزكاة والدخل',
  'شهادة الضريبة المضافة',
  'عقد إيجار المنشأة',
  'العنوان الوطني للمنشأة والملاك',
  'موقع المنشأة من Google',
  'شهادة الآيبان بالباركود',
  'العقود إن وجدت',
  'التصريح للنشاطات الخاصة حسب الجهة التابعة لها',
];

function normalizeDocumentName(value = '') {
  return String(value).trim().toLowerCase();
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

async function ensureRequestDocuments(requestId, extraDocuments = []) {
  const requiredDocuments = uniqueDocumentNames([
    ...STANDARD_REQUEST_DOCUMENTS,
    ...extraDocuments,
  ]);

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

  return db.prepare('SELECT * FROM request_documents WHERE request_id = ? ORDER BY id').all(requestId);
}

module.exports = {
  STANDARD_REQUEST_DOCUMENTS,
  ensureRequestDocuments,
  uniqueDocumentNames,
};