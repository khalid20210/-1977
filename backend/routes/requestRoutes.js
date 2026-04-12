const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');
const { analyzeBankStatement, analyzeDocument } = require('../services/aiService');

const router = express.Router();

// File upload configs
const makeStorage = (subDir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads', subDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf|webp/;
  if (allowed.test(path.extname(file.originalname).toLowerCase().slice(1))) return cb(null, true);
  cb(new Error('نوع الملف غير مدعوم. المسموح: PDF, JPG, PNG, WEBP'));
};

const bankUpload = multer({ storage: makeStorage('bank-statements'), fileFilter, limits: { fileSize: 25 * 1024 * 1024 } });
const docUpload = multer({ storage: makeStorage('documents'), fileFilter, limits: { fileSize: 15 * 1024 * 1024 } });
const completeUpload = multer({ storage: makeStorage('complete-files'), limits: { fileSize: 100 * 1024 * 1024 } });
const contractUpload = multer({ storage: makeStorage('contracts'), limits: { fileSize: 20 * 1024 * 1024 } });
const accountUpload = multer({ storage: makeStorage('account-statements'), fileFilter: (req, file, cb) => {
  const allowed = /xlsx|xls/;
  if (allowed.test(path.extname(file.originalname).toLowerCase().slice(1))) return cb(null, true);
  cb(new Error('نوع الملف غير مدعوم. المسموح: XLSX, XLS'));
}, limits: { fileSize: 25 * 1024 * 1024 } });
const taxUpload = multer({ storage: makeStorage('tax-documents'), fileFilter, limits: { fileSize: 25 * 1024 * 1024 } });

// Helper: check eligibility against funding entities
async function checkEligibility(totalPos, totalDeposit, totalTransfer, months, fundingType, bankName = '', recordAgeMonths = 0, ownershipType = 'سعودي', entityType = 'شركة') {
  const entities = await db.prepare('SELECT * FROM funding_entities WHERE is_active = 1 ORDER BY priority DESC').all();
  let eligibleEntities = [];
  let eligibleTypes = ['نقاط بيع', 'كاش', 'إقرارات ضريبية', 'رهن', 'أسطول', 'تمويل شخصي', 'عقار', 'تمويل تجاري'];

  if (fundingType === 'نقاط بيع') {
    // Special logic for نقاط بيع
    const isRajhi = bankName && bankName.toLowerCase().includes('راجحي');
    const posLast12Months = totalPos; // Assume totalPos is for last 12 months
    const isSaudi = ownershipType === 'سعودي';
    const isIndividualOrInstitution = ['شخص واحد', 'مؤسسة'].includes(entityType);

    if (posLast12Months >= 1500000) {
      // Eligible for مصرف الراجحي regardless of bank
      eligibleEntities = entities.filter(e => e.name.toLowerCase().includes('راجحي'));
    } else if (posLast12Months >= 700000 && recordAgeMonths >= 7 && isRajhi) {
      // Eligible for أمكان or مصرف الراجحي, but أمكان only for Saudi individual/institution
      let candidates = entities.filter(e => e.name.toLowerCase().includes('راجحي'));
      if (isSaudi && isIndividualOrInstitution) {
        candidates = candidates.concat(entities.filter(e => e.name.toLowerCase().includes('أمكان')));
      }
      eligibleEntities = candidates;
    } else if (!isRajhi && posLast12Months >= 500000 && posLast12Months < 1000000 && recordAgeMonths >= 24) {
      // Eligible for شركة الأولى للتمويل
      eligibleEntities = entities.filter(e => e.name.toLowerCase().includes('الأولى'));
    } else {
      // Not eligible for نقاط بيع
      eligibleTypes = eligibleTypes.filter(t => t !== 'نقاط بيع');
      eligibleEntities = [];
    }
  } else {
    // Other funding types will be handled later via admin configuration and AI
    eligibleTypes = eligibleTypes.filter(t => t !== fundingType);
    eligibleEntities = [];
  }

  return { entities: eligibleEntities, types: eligibleTypes };
}

// Helper: check and update docs status
async function checkAndUpdateDocStatus(requestId) {
  const docs = await db.prepare('SELECT * FROM request_documents WHERE request_id = ?').all(requestId);
  if (docs.length === 0) return;
  const allUploaded = docs.every(d => d.file_path !== null);
  const allValid = docs.every(d => d.status === 'valid');
  if (allUploaded && allValid) {
    await db.prepare("UPDATE requests SET status = 'docs_ready', updated_at = NOW() WHERE id = ?").run(requestId);
  }
}

async function getRequestForAccess(requestId) {
  return db.prepare('SELECT id, user_id FROM requests WHERE id = ?').get(requestId);
}

function canAccessRequestChat(request, user) {
  if (!request) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'employee' && Number(request.user_id) === Number(user.id)) return true;
  return false;
}

// POST /api/requests/eligibility-check — فحص أهلية المنشأة
router.post('/eligibility-check', authMiddleware, async (req, res) => {
  try {
    const {
      totalPos = 0, totalDeposit = 0, totalTransfer = 0,
      months = 12, fundingType = 'نقاط بيع', bankName = '',
      recordAgeMonths = 0, ownershipType = 'سعودي', entityType = 'شركة'
    } = req.body;

    const result = await checkEligibility(
      Number(totalPos), Number(totalDeposit), Number(totalTransfer),
      Number(months), fundingType, bankName,
      Number(recordAgeMonths), ownershipType, entityType
    );

    // Build recommendations
    const tips = [];
    if (fundingType === 'نقاط بيع') {
      if (Number(totalPos) < 500000)  tips.push('نقاط البيع أقل من 500 ألف ر.س — يُنصح برفع حجم المبيعات');
      if (Number(totalPos) < 1500000) tips.push('لتحقيق أعلى أهلية: نقاط البيع يجب أن تتجاوز 1.5 مليون ر.س سنوياً');
      if (Number(recordAgeMonths) < 24) tips.push('عمر السجل التجاري أقل من سنتين — بعض الجهات تشترط 24 شهراً');
    }
    if (Number(months) < 6) tips.push('يُفضّل تقديم كشف حساب لـ 6 أشهر على الأقل');

    res.json({ ...result, tips });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في فحص الأهلية' });
  }
});

// GET /api/requests/partners-list — list of approved partners (for broker dropdown)
router.get('/partners-list', authMiddleware, async (req, res) => {
  try {
    const partners = await db.prepare(`
      SELECT id, name, phone, partner_type FROM users
      WHERE role = 'partner' AND status = 'approved'
      ORDER BY name
    `).all();
    res.json(partners);
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// GET /api/requests
router.get('/', authMiddleware, async (req, res) => {
  try {
    const requests = await db.prepare(`
      SELECT r.*,
             fe.name as funding_entity_name,
             p.name as referred_by_name,
             p.phone as referred_by_phone,
             (SELECT COUNT(*) FROM request_documents rd WHERE rd.request_id = r.id) as doc_total,
             (SELECT COUNT(*) FROM request_documents rd WHERE rd.request_id = r.id AND rd.status = 'valid') as doc_valid,
             (SELECT COALESCE(json_agg(json_build_object('id', bs.id, 'file_name', bs.file_name)) FILTER (WHERE bs.id IS NOT NULL), '[]'::json) FROM bank_statements bs WHERE bs.request_id = r.id) as bank_statements,
             (SELECT COALESCE(json_agg(json_build_object('id', acs.id, 'file_name', acs.file_name)) FILTER (WHERE acs.id IS NOT NULL), '[]'::json) FROM account_statements acs WHERE acs.request_id = r.id) as account_statements,
             (SELECT COALESCE(json_agg(json_build_object('id', td.id, 'file_name', td.file_name)) FILTER (WHERE td.id IS NOT NULL), '[]'::json) FROM tax_documents td WHERE td.request_id = r.id) as tax_documents
      FROM requests r
      LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id
      LEFT JOIN users p ON r.referred_by_id = p.id
      WHERE r.user_id = ?
      ORDER BY r.updated_at DESC
    `).all(req.user.id);
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في استرجاع الطلبات' });
  }
});

// POST /api/requests
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { funding_type, company_name, entity_type, ownership_type, owners_count, owner_name, owner_phone, referred_by_id } = req.body;
    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: 'اسم الشركة / المؤسسة مطلوب' });
    }
    let partnerId = null;
    if (referred_by_id) {
      const partner = await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'partner' AND status = 'approved'").get(referred_by_id);
      if (partner) partnerId = partner.id;
    }
    const result = await db.prepare(`
      INSERT INTO requests (user_id, funding_type, company_name, entity_type, ownership_type, owners_count, owner_name, owner_phone, referred_by_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(req.user.id, funding_type || 'نقاط بيع', company_name.trim(), entity_type || 'شركة', ownership_type || 'سعودي', owners_count || 'شخص واحد', owner_name || null, owner_phone || null, partnerId);

    const reqId = result.lastInsertRowid;

    await db.prepare(`
      INSERT INTO companies (company_name, entity_type, owner_name, owner_phone, request_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(company_name.trim(), entity_type || 'شركة', owner_name || null, owner_phone || null, reqId, req.user.id);

    const request = await db.prepare('SELECT * FROM requests WHERE id = ?').get(reqId);
    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في إنشاء الطلب' });
  }
});

// GET /api/requests/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const request = await db.prepare(`
      SELECT r.*, fe.name as funding_entity_name, fe.whatsapp_number as fe_whatsapp,
             fe.required_documents as fe_required_docs,
             u.name as user_name, u.phone as user_phone, u.email as user_email,
             p.name as referred_by_name, p.phone as referred_by_phone, p.partner_type as referred_by_type
      FROM requests r
      LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users p ON r.referred_by_id = p.id
      WHERE r.id = ? AND (r.user_id = ? OR ? = 'admin')
    `).get(req.params.id, req.user.id, req.user.role);

    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    const bankStatements = await db.prepare('SELECT * FROM bank_statements WHERE request_id = ? ORDER BY uploaded_at').all(req.params.id);
    const accountStatements = await db.prepare('SELECT * FROM account_statements WHERE request_id = ? ORDER BY uploaded_at').all(req.params.id);
    const taxDocuments = await db.prepare('SELECT * FROM tax_documents WHERE request_id = ? ORDER BY uploaded_at').all(req.params.id);
    const documents = await db.prepare('SELECT * FROM request_documents WHERE request_id = ? ORDER BY id').all(req.params.id);
    const statusHistory = await db.prepare(`
      SELECT sh.*, u.name as created_by_name
      FROM status_history sh
      LEFT JOIN users u ON sh.created_by = u.id
      WHERE sh.request_id = ? ORDER BY sh.created_at DESC
    `).all(req.params.id);

    let analysisResult = {};
    try { analysisResult = JSON.parse(request.analysis_result || '{}'); } catch (e) {}

    res.json({ ...request, analysis_result: analysisResult, bank_statements: bankStatements, account_statements: accountStatements, tax_documents: taxDocuments, documents, status_history: statusHistory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في استرجاع الطلب' });
  }
});

// GET /api/requests/:id/messages — internal chat (admin + employee owner)
router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const request = await getRequestForAccess(req.params.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (!canAccessRequestChat(request, req.user)) return res.status(403).json({ error: 'غير مصرح' });

    const messages = await db.prepare(`
      SELECT rm.id, rm.request_id, rm.sender_id, rm.message, rm.created_at,
             u.name as sender_name, u.role as sender_role
      FROM request_messages rm
      LEFT JOIN users u ON u.id = rm.sender_id
      WHERE rm.request_id = ?
      ORDER BY rm.created_at ASC, rm.id ASC
    `).all(req.params.id);

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في تحميل المحادثة' });
  }
});

// POST /api/requests/:id/messages — send internal chat message
router.post('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const request = await getRequestForAccess(req.params.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (!canAccessRequestChat(request, req.user)) return res.status(403).json({ error: 'غير مصرح' });

    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'نص الرسالة مطلوب' });

    const r = await db.prepare('INSERT INTO request_messages (request_id, sender_id, message) VALUES (?, ?, ?)')
      .run(req.params.id, req.user.id, message);

    const created = await db.prepare(`
      SELECT rm.id, rm.request_id, rm.sender_id, rm.message, rm.created_at,
             u.name as sender_name, u.role as sender_role
      FROM request_messages rm
      LEFT JOIN users u ON u.id = rm.sender_id
      WHERE rm.id = ?
    `).get(r.lastInsertRowid);

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في إرسال الرسالة' });
  }
});

// GET /api/messages/unread-count — عدد الرسائل غير المقروءة في جميع الطلبات
router.get('/messages/unread-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;
    const row = role === 'admin'
      ? await db.prepare(`
          SELECT COUNT(*) as c FROM request_messages rm
          LEFT JOIN message_reads mr ON mr.user_id = ? AND mr.request_id = rm.request_id
          WHERE rm.sender_id != ?
            AND (mr.last_read_at IS NULL OR rm.created_at > mr.last_read_at)
        `).get(userId, userId)
      : await db.prepare(`
          SELECT COUNT(*) as c FROM request_messages rm
          JOIN requests r ON r.id = rm.request_id
          LEFT JOIN message_reads mr ON mr.user_id = ? AND mr.request_id = rm.request_id
          WHERE r.user_id = ? AND rm.sender_id != ?
            AND (mr.last_read_at IS NULL OR rm.created_at > mr.last_read_at)
        `).get(userId, userId, userId);
    res.json({ count: row?.c || 0 });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

// POST /api/requests/:id/mark-read — تحديد رسائل الطلب كمقروءة
router.post('/:id/mark-read', authMiddleware, async (req, res) => {
  try {
    await db.prepare(`
      INSERT INTO message_reads (user_id, request_id, last_read_at)
      VALUES (?, ?, NOW())
      ON CONFLICT(user_id, request_id) DO UPDATE SET last_read_at = NOW()
    `).run(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// POST /api/requests/:id/bank-statements
router.post('/:id/bank-statements', authMiddleware, bankUpload.array('files', 15), async (req, res) => {
  try {
    const request = await db.prepare('SELECT * FROM requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });

    const inserted = [];
    for (const file of req.files) {
      const r = await db.prepare(`
        INSERT INTO bank_statements (request_id, file_path, file_name, analysis_status)
        VALUES (?, ?, ?, 'pending')
      `).run(req.params.id, file.path, file.originalname);
      inserted.push({ id: r.lastInsertRowid, file_name: file.originalname });
    }

    await db.prepare("UPDATE requests SET status = 'bank_uploaded', updated_at = NOW() WHERE id = ?").run(req.params.id);
    res.json({ message: `تم رفع ${req.files.length} كشف بنجاح`, statements: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في رفع الملفات' });
  }
});

// POST /api/requests/:id/analyze-banks
router.post('/:id/analyze-banks', authMiddleware, async (req, res) => {
  try {
    const request = await db.prepare('SELECT * FROM requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    const statements = await db.prepare("SELECT * FROM bank_statements WHERE request_id = ? AND analysis_status = 'pending'").all(req.params.id);
    if (statements.length === 0) return res.status(400).json({ error: 'لا توجد كشوفات جديدة للتحليل' });

    await db.prepare("UPDATE requests SET status = 'analyzing', updated_at = NOW() WHERE id = ?").run(req.params.id);

    let totalPos = 0, totalDeposit = 0, totalTransfer = 0;
    const details = [];
    const errors = [];

    for (const stmt of statements) {
      try {
        const analysis = await analyzeBankStatement(stmt.file_path, stmt.file_name);
        await db.prepare(`
          UPDATE bank_statements SET
            pos_amount = ?, deposit_amount = ?, transfer_amount = ?,
            period_label = ?, analysis_status = 'done', analysis_data = ?
          WHERE id = ?
        `).run(analysis.total_pos, analysis.total_deposit, analysis.total_transfer,
               analysis.period_label, JSON.stringify(analysis), stmt.id);
        totalPos += analysis.total_pos;
        totalDeposit += analysis.total_deposit;
        totalTransfer += analysis.total_transfer;
        details.push({ stmt_id: stmt.id, ...analysis });
      } catch (aiErr) {
        await db.prepare("UPDATE bank_statements SET analysis_status = 'failed' WHERE id = ?").run(stmt.id);
        errors.push({ stmt_id: stmt.id, file: stmt.file_name, error: aiErr.message });
      }
    }

    // Add previously analyzed statements
    const prevAnalyzed = await db.prepare("SELECT * FROM bank_statements WHERE request_id = ? AND analysis_status = 'done'").all(req.params.id);
    for (const ps of prevAnalyzed) {
      if (!details.find(d => d.stmt_id === ps.id)) {
        totalPos += ps.pos_amount;
        totalDeposit += ps.deposit_amount;
        totalTransfer += ps.transfer_amount;
      }
    }

    const monthCount = (await db.prepare("SELECT COUNT(*) as c FROM bank_statements WHERE request_id = ? AND analysis_status = 'done'").get(req.params.id)).c;
    const firstStmt = await db.prepare("SELECT * FROM bank_statements WHERE request_id = ? LIMIT 1").get(req.params.id);
    const bankName = firstStmt ? (JSON.parse(firstStmt.analysis_data || '{}').bank_name || '') : '';
    const recordAgeMonths = monthCount;
    const eligibility = await checkEligibility(totalPos, totalDeposit, totalTransfer, monthCount, request.funding_type, bankName, recordAgeMonths, request.ownership_type, request.entity_type);
    const eligibleEntities = eligibility.entities;
    const eligibleTypes = eligibility.types;

    await db.prepare(`
      UPDATE requests SET
        total_pos = ?, total_deposit = ?, total_transfer = ?,
        statement_months = ?, status = 'analyzed',
        analysis_result = ?, updated_at = NOW()
      WHERE id = ?
    `).run(totalPos, totalDeposit, totalTransfer, monthCount,
           JSON.stringify({ details, eligible_entities: eligibleEntities, eligible_types: eligibleTypes, errors }),
           req.params.id);

    res.json({ total_pos: totalPos, total_deposit: totalDeposit, total_transfer: totalTransfer, months: monthCount, eligible_entities: eligibleEntities, eligible_types: eligibleTypes, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'خطأ في التحليل' });
  }
});

// POST /api/requests/:id/account-statements
router.post('/:id/account-statements', authMiddleware, accountUpload.array('files', 15), async (req, res) => {
  try {
    const request = await db.prepare('SELECT * FROM requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });

    const inserted = [];
    for (const file of req.files) {
      const r = await db.prepare(`
        INSERT INTO account_statements (request_id, file_path, file_name)
        VALUES (?, ?, ?)
      `).run(req.params.id, file.path, file.originalname);
      inserted.push({ id: r.lastInsertRowid, file_name: file.originalname });
    }

    res.json({ message: `تم رفع ${req.files.length} كشف حساب بنجاح`, statements: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في رفع الملفات' });
  }
});

// POST /api/requests/:id/tax-documents
router.post('/:id/tax-documents', authMiddleware, taxUpload.array('files', 15), async (req, res) => {
  try {
    const request = await db.prepare('SELECT * FROM requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });

    const inserted = [];
    for (const file of req.files) {
      const r = await db.prepare(`
        INSERT INTO tax_documents (request_id, file_path, file_name)
        VALUES (?, ?, ?)
      `).run(req.params.id, file.path, file.originalname);
      inserted.push({ id: r.lastInsertRowid, file_name: file.originalname });
    }

    res.json({ message: `تم رفع ${req.files.length} وثيقة ضريبية بنجاح`, documents: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في رفع الملفات' });
  }
});

// POST /api/requests/:id/select-entity
router.post('/:id/select-entity', authMiddleware, async (req, res) => {
  try {
    const { funding_entity_id } = req.body;
    const request = await db.prepare('SELECT * FROM requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    const entity = await db.prepare('SELECT * FROM funding_entities WHERE id = ?').get(funding_entity_id);
    if (!entity) return res.status(404).json({ error: 'الجهة التمويلية غير موجودة' });

    const requiredDocs = JSON.parse(entity.required_documents || '[]');

    // Reset documents for new entity selection
    await db.prepare('DELETE FROM request_documents WHERE request_id = ?').run(req.params.id);
    for (const docName of requiredDocs) {
      await db.prepare("INSERT INTO request_documents (request_id, document_name, status) VALUES (?, ?, 'missing')").run(req.params.id, docName);
    }

    await db.prepare("UPDATE requests SET funding_entity_id = ?, status = 'docs_pending', updated_at = NOW() WHERE id = ?").run(funding_entity_id, req.params.id);

    res.json({ message: 'تم اختيار الجهة التمويلية', required_documents: requiredDocs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في اختيار الجهة' });
  }
});

// POST /api/requests/:id/documents/:docId/upload
router.post('/:id/documents/:docId/upload', authMiddleware, docUpload.single('file'), async (req, res) => {
  try {
    const request = await db.prepare('SELECT * FROM requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    const doc = await db.prepare('SELECT * FROM request_documents WHERE id = ? AND request_id = ?').get(req.params.docId, req.params.id);
    if (!doc) return res.status(404).json({ error: 'المستند غير موجود' });
    if (!req.file) return res.status(400).json({ error: 'لم يتم رفع الملف' });

    let expiryDate = null;
    let docStatus = 'valid';
    let aiResult = null;

    try {
      aiResult = await analyzeDocument(req.file.path, req.file.originalname);
      expiryDate = aiResult.expiry_date && aiResult.expiry_date !== 'null' ? aiResult.expiry_date : null;
      docStatus = aiResult.is_expired ? 'expired' : 'valid';
    } catch (aiErr) {
      console.error('Doc AI error:', aiErr.message);
      docStatus = 'valid';
    }

    await db.prepare(`
      UPDATE request_documents SET
        file_path = ?, file_name = ?, expiry_date = ?, status = ?, uploaded_at = NOW()
      WHERE id = ?
    `).run(req.file.path, req.file.originalname, expiryDate, docStatus, req.params.docId);

    await checkAndUpdateDocStatus(req.params.id);

    res.json({
      message: docStatus === 'expired' ? '⚠️ تحذير: المستند منتهي الصلاحية! يرجى تحديثه.' : 'تم رفع المستند بنجاح',
      status: docStatus,
      expiry_date: expiryDate,
      ai_notes: aiResult?.notes || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في رفع المستند' });
  }
});

// POST /api/requests/:id/mark-forms-sent
router.post('/:id/mark-forms-sent', authMiddleware, async (req, res) => {
  try {
    const request = await db.prepare('SELECT * FROM requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    await db.prepare("UPDATE requests SET status = 'forms_sent', updated_at = NOW() WHERE id = ?").run(req.params.id);
    res.json({ message: 'تم تأكيد رفع النماذج للجهة التمويلية' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// POST /api/requests/:id/submit-file
router.post('/:id/submit-file', authMiddleware, completeUpload.single('file'), async (req, res) => {
  try {
    const request = await db.prepare('SELECT * FROM requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    const filePath = req.file ? req.file.path : null;
    const fileName = req.file ? req.file.originalname : null;

    await db.prepare(`
      UPDATE requests SET
        status = 'file_submitted',
        complete_file_path = ?,
        complete_file_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `).run(filePath, fileName, req.params.id);

    await db.prepare('INSERT INTO status_history (request_id, status, note, created_by) VALUES (?, ?, ?, ?)').run(
      req.params.id, 'file_submitted', 'تم رفع الملف الكامل من الموظف', req.user.id
    );

    res.json({ message: 'تم إرسال الملف للمدير بنجاح. سيتم مراجعته قريباً.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في إرسال الملف' });
  }
});

// POST /api/requests/:id/submit-missing
router.post('/:id/submit-missing', authMiddleware, async (req, res) => {
  try {
    const request = await db.prepare('SELECT * FROM requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    await db.prepare("UPDATE requests SET status = 'missing_submitted', updated_at = NOW() WHERE id = ?").run(req.params.id);
    await db.prepare('INSERT INTO status_history (request_id, status, note, created_by) VALUES (?, ?, ?, ?)').run(
      req.params.id, 'missing_submitted', 'تم إرسال النواقص من الموظف', req.user.id
    );

    res.json({ message: 'تم إرسال النواقص للمدير بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// POST /api/requests/:id/upload-consultation-contract — employee uploads consultation contract
router.post('/:id/upload-consultation-contract', authMiddleware, contractUpload.single('file'), async (req, res) => {
  try {
    const request = await db.prepare('SELECT * FROM requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });

    await db.prepare(
      'INSERT INTO contracts (request_id, contract_type, file_path, file_name, uploaded_by) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.id, 'consultation', req.file.path, req.file.originalname, req.user.id);

    await db.prepare(`
      UPDATE requests SET
        consultation_contract_path = ?,
        consultation_contract_name = ?,
        status = 'contract_submitted',
        updated_at = NOW()
      WHERE id = ?
    `).run(req.file.path, req.file.originalname, req.params.id);

    await db.prepare('INSERT INTO status_history (request_id, status, note, created_by) VALUES (?, ?, ?, ?)').run(
      req.params.id, 'contract_submitted', 'تم رفع عقد الاستشارات وإرساله للمدير', req.user.id
    );

    res.json({ message: 'تم رفع عقد الاستشارات بنجاح وإرساله للمدير' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في رفع العقد' });
  }
});

// PUT /api/requests/:id — edit basic request info
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const request = await db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (req.user.role !== 'admin' && request.user_id !== req.user.id) {
      return res.status(403).json({ error: 'غير مصرح' });
    }
    const { company_name, owner_name, owner_phone, entity_type, ownership_type, funding_type, referred_by_id } = req.body;
    if (!company_name || !company_name.trim()) return res.status(400).json({ error: 'اسم الشركة مطلوب' });
    let partnerId = request.referred_by_id;
    if (referred_by_id !== undefined) {
      if (referred_by_id) {
        const partner = await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'partner' AND status = 'approved'").get(referred_by_id);
        partnerId = partner ? partner.id : null;
      } else { partnerId = null; }
    }
    await db.prepare(`
      UPDATE requests SET
        company_name = ?, owner_name = ?, owner_phone = ?,
        entity_type = ?, ownership_type = ?, funding_type = ?,
        referred_by_id = ?, updated_at = NOW()
      WHERE id = ?`
    ).run(
      company_name.trim(), owner_name || null, owner_phone || null,
      entity_type || request.entity_type, ownership_type || request.ownership_type,
      funding_type || request.funding_type, partnerId, req.params.id
    );
    await db.prepare('UPDATE companies SET company_name = ?, entity_type = ?, owner_name = ?, owner_phone = ? WHERE request_id = ?')
      .run(company_name.trim(), entity_type || request.entity_type, owner_name || null, owner_phone || null, req.params.id);
    const updated = await db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في تعديل الطلب' });
  }
});

// DELETE /api/requests/:id — admin hard delete
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'المدير فقط يمكنه الحذف' });
    const request = await db.prepare('SELECT id FROM requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    await db.prepare('DELETE FROM status_history WHERE request_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM request_messages WHERE request_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM request_documents WHERE request_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم حذف الطلب' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الحذف' });
  }
});

// POST /api/requests/:id/request-delete
router.post('/:id/request-delete', authMiddleware, async (req, res) => {
  try {
    const request = await db.prepare('SELECT * FROM requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (['approved', 'transferred', 'fees_received'].includes(request.status)) {
      return res.status(400).json({ error: 'لا يمكن حذف طلب تمت الموافقة عليه' });
    }
    const { reason } = req.body;
    if (!reason || !reason.trim()) return res.status(400).json({ error: 'سبب الحذف مطلوب' });

    await db.prepare(`UPDATE requests SET status = 'delete_requested', delete_reason = ?, updated_at = NOW() WHERE id = ?`)
      .run(reason.trim(), req.params.id);
    await db.prepare('INSERT INTO status_history (request_id, status, note, created_by) VALUES (?, ?, ?, ?)')
      .run(req.params.id, 'delete_requested', `طلب حذف - السبب: ${reason.trim()}`, req.user.id);

    res.json({ message: 'تم إرسال طلب الحذف للمدير' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إرسال طلب الحذف' });
  }
});

// GET /api/requests/clients-summary - list of companies submitted to funding
router.get('/clients-summary/all', authMiddleware, async (req, res) => {
  try {
    const clients = await db.prepare(`
      SELECT DISTINCT
        r.id,
        r.company_name,
        r.owner_name,
        r.owner_phone,
        r.entity_type,
        r.created_at,
        r.total_deposit,
        r.total_transfer,
        r.funding_entity_id,
        fe.name as funding_entity_name,
        r.status
      FROM requests r
      LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id
      WHERE r.user_id = ? AND r.status IN ('submitted','approved','transferred','fees_received')
      ORDER BY r.created_at DESC
    `).all(req.user.id);

    res.json(clients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في استرجاع البيانات' });
  }
});

module.exports = router;
