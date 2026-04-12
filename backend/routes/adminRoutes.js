const express = require('express');
const db = require('../database');
const { adminMiddleware, authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// ===== USERS =====
router.post('/users', adminMiddleware, (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { name, email, role, phone, partner_type, password } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'الاسم مطلوب' });
    if (!email || !email.trim()) return res.status(400).json({ error: 'البريد مطلوب' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    const dup = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (dup) return res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
    const hashed = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password, role, phone, partner_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(name.trim(), email.trim().toLowerCase(), hashed, role || 'employee', phone?.trim() || null, partner_type?.trim() || null, 'approved');
    res.status(201).json({ id: result.lastInsertRowid, message: 'تم إنشاء المستخدم بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إنشاء المستخدم' });
  }
});

router.get('/users', adminMiddleware, (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, role, partner_type, status, phone, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في استرجاع المستخدمين' });
  }
});

router.get('/users/pending-count', adminMiddleware, (req, res) => {
  try {
    const row = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'pending'").get();
    res.json({ count: row.count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

// PUT /api/admin/users/:id — edit name, email, role, phone, partner_type
router.put('/users/:id', adminMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    const { name, email, role, phone, partner_type } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'الاسم مطلوب' });
    if (!email || !email.trim()) return res.status(400).json({ error: 'البريد مطلوب' });
    if (user.role === 'admin' && role && role !== 'admin') return res.status(403).json({ error: 'لا يمكن تغيير دور الأدمن' });
    // check email uniqueness
    const dup = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.trim().toLowerCase(), req.params.id);
    if (dup) return res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
    db.prepare('UPDATE users SET name = ?, email = ?, role = ?, phone = ?, partner_type = ? WHERE id = ?')
      .run(name.trim(), email.trim().toLowerCase(), role || user.role, phone?.trim() || null, partner_type?.trim() || null, req.params.id);
    res.json({ message: 'تم تحديث بيانات المستخدم' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التعديل' });
  }
});

router.put('/users/:id/status', adminMiddleware, (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'blocked', 'pending'].includes(status)) return res.status(400).json({ error: 'حالة غير صحيحة' });
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (user.role === 'admin') return res.status(403).json({ error: 'لا يمكن تغيير حالة الأدمن' });
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'تم تحديث الحالة بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث الحالة' });
  }
});

router.delete('/users/:id', adminMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (user.role === 'admin') return res.status(403).json({ error: 'لا يمكن حذف الأدمن' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم حذف المستخدم' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الحذف' });
  }
});

// PUT change user password
router.put('/users/:id/password', adminMiddleware, (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }
    
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    
    // Simple hashing (في الإنتاج استخدم bcrypt)
    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.id);
    res.json({ message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث كلمة المرور' });
  }
});


// ===== REQUESTS =====
router.get('/requests', adminMiddleware, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT r.*, u.name as user_name, u.phone as user_phone,
             fe.name as funding_entity_name, fe.whatsapp_number as fe_whatsapp
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id
      ORDER BY r.updated_at DESC
    `).all();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في استرجاع الطلبات' });
  }
});

router.get('/requests/:id', adminMiddleware, (req, res) => {
  try {
    const request = db.prepare(`
      SELECT r.*, u.name as user_name, u.phone as user_phone, u.email as user_email,
             fe.name as funding_entity_name, fe.whatsapp_number as fe_whatsapp
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id
      WHERE r.id = ?
    `).get(req.params.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    const bankStatements = db.prepare('SELECT * FROM bank_statements WHERE request_id = ? ORDER BY uploaded_at').all(req.params.id);
    const documents = db.prepare('SELECT * FROM request_documents WHERE request_id = ? ORDER BY id').all(req.params.id);
    const statusHistory = db.prepare(`
      SELECT sh.*, u.name as created_by_name FROM status_history sh
      LEFT JOIN users u ON sh.created_by = u.id
      WHERE sh.request_id = ? ORDER BY sh.created_at DESC
    `).all(req.params.id);

    let analysisResult = {};
    try { analysisResult = JSON.parse(request.analysis_result || '{}'); } catch (e) {}

    res.json({ ...request, analysis_result: analysisResult, bank_statements: bankStatements, documents, status_history: statusHistory });
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.put('/requests/:id/status', adminMiddleware, (req, res) => {
  try {
    const { status, note, rejection_reason } = req.body;
    const validStatuses = [
      'draft', 'bank_uploaded', 'analyzing', 'analyzed', 'docs_pending',
      'docs_ready', 'contract_submitted', 'forms_ready', 'forms_sent', 'file_submitted',
      'missing', 'missing_submitted', 'contract_received',
      'submitted', 'approved', 'transferred', 'fees_received', 'rejected'
    ];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'حالة غير صحيحة' });

    if (status === 'rejected' && rejection_reason) {
      db.prepare("UPDATE requests SET status = ?, rejection_reason = ?, updated_at = datetime('now') WHERE id = ?")
        .run(status, rejection_reason, req.params.id);
    } else {
      db.prepare("UPDATE requests SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
    }
    db.prepare('INSERT INTO status_history (request_id, status, note, created_by) VALUES (?, ?, ?, ?)').run(
      req.params.id, status, note || rejection_reason || null, req.user.id
    );
    res.json({ message: 'تم تحديث حالة الطلب' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث الحالة' });
  }
});

router.post('/requests/:id/send-missing', adminMiddleware, (req, res) => {
  try {
    const { missing_items, note } = req.body;
    if (!missing_items || !Array.isArray(missing_items) || missing_items.length === 0) {
      return res.status(400).json({ error: 'قائمة النواقص مطلوبة' });
    }

    // Add missing items as new document requests
    const insertDoc = db.prepare("INSERT INTO request_documents (request_id, document_name, status) VALUES (?, ?, 'missing')");
    for (const item of missing_items) {
      insertDoc.run(req.params.id, item);
    }

    db.prepare("UPDATE requests SET status = 'missing', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    db.prepare('INSERT INTO status_history (request_id, status, note, created_by) VALUES (?, ?, ?, ?)').run(
      req.params.id, 'missing',
      `نواقص مطلوبة: ${missing_items.join('، ')}${note ? ' - ' + note : ''}`,
      req.user.id
    );

    res.json({ message: 'تم إرسال النواقص للموظف' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إرسال النواقص' });
  }
});

// GET missing items requests for dashboard
router.get('/missing-requests', adminMiddleware, (req, res) => {
  try {
    const missingByType = db.prepare(`
      SELECT 
        'employees' as type,
        COUNT(DISTINCT r.user_id) as count,
        COUNT(r.id) as total_requests
      FROM requests r
      WHERE r.status = 'missing'
      UNION ALL
      SELECT 
        'partners' as type,
        COUNT(DISTINCT u.id) as count,
        COUNT(r.id) as total_requests
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.status = 'missing' AND u.role IN ('partner', 'company')
    `).all();

    res.json({ by_type: missingByType });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل البيانات' });
  }
});

// GET employees/partners with missing requests
router.get('/missing-recipients/:type', adminMiddleware, (req, res) => {
  try {
    const { type } = req.params; // 'employees' or 'partners'
    
    let query, params;
    if (type === 'employees') {
      query = `
        SELECT DISTINCT
          u.id, u.name, u.phone, u.email, u.role,
          COUNT(r.id) as missing_count
        FROM users u
        LEFT JOIN requests r ON u.id = r.user_id AND r.status = 'missing'
        WHERE u.role = 'employee'
        GROUP BY u.id
        HAVING COUNT(r.id) > 0
        ORDER BY u.name
      `;
    } else if (type === 'partners') {
      query = `
        SELECT DISTINCT
          u.id, u.name, u.phone, u.email, u.role, u.partner_type,
          COUNT(r.id) as missing_count
        FROM users u
        LEFT JOIN requests r ON u.id = r.user_id AND r.status = 'missing'
        WHERE u.role IN ('partner', 'company')
        GROUP BY u.id
        HAVING COUNT(r.id) > 0
        ORDER BY u.name
      `;
    } else {
      return res.status(400).json({ error: 'نوع غير صحيح' });
    }

    const recipients = db.prepare(query).all();
    res.json(recipients);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل البيانات' });
  }
});

// GET missing requests for a specific user
router.get('/missing-requests/:userId', adminMiddleware, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT r.*, u.name as user_name, u.phone as user_phone,
             fe.name as funding_entity_name
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id
      WHERE r.user_id = ? AND r.status = 'missing'
      ORDER BY r.updated_at DESC
    `).all(req.params.userId);
    
    // Include missing documents for each request
    const enriched = requests.map(req => {
      const docs = db.prepare(`
        SELECT document_name FROM request_documents 
        WHERE request_id = ? AND status = 'missing'
      `).all(req.id);
      return { ...req, missing_documents: docs.map(d => d.document_name) };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل البيانات' });
  }
});

// POST send missing items alert (with WhatsApp)
router.post('/send-missing-alert', adminMiddleware, (req, res) => {
  try {
    const { recipient_id, request_id, missing_items, message, phone_number } = req.body;
    
    if (!recipient_id || !request_id || !missing_items || !phone_number) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
    }

    if (!Array.isArray(missing_items)) {
      return res.status(400).json({ error: 'قائمة النواقص يجب أن تكون مصفوفة' });
    }

    // Get request and user info
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(request_id);
    const recipient = db.prepare('SELECT * FROM users WHERE id = ?').get(recipient_id);
    
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (!recipient) return res.status(404).json({ error: 'المستخدم غير موجود' });

    // Save alert record
    const result = db.prepare(`
      INSERT INTO missing_items_alerts 
      (request_id, recipient_id, recipient_type, missing_items, message, phone_number, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      request_id,
      recipient_id,
      recipient.role === 'employee' ? 'employee' : 'partner',
      JSON.stringify(missing_items),
      message || '',
      phone_number,
      req.user.id
    );

    // Update request status if needed
    if (request.status !== 'missing') {
      db.prepare("UPDATE requests SET status = 'missing', updated_at = datetime('now') WHERE id = ?").run(request_id);
    }

    res.json({ 
      message: 'تم تسجيل إرسال النواقص بنجاح',
      alert_id: result.lastInsertRowid,
      whatsapp_url: `https://wa.me/${phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(message || '')}`
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ: ' + err.message });
  }
});

// GET pending alerts (not completed after 24 hours)
router.get('/pending-missing-alerts', adminMiddleware, (req, res) => {
  try {
    // Get alerts where 24 hours have passed and not yet completed
    const pending = db.prepare(`
      SELECT 
        a.*,
        u.name as recipient_name,
        r.company_name,
        r.status as request_status,
        CAST((julianday('now') - julianday(a.alert_sent_at)) * 24 AS INTEGER) as hours_elapsed
      FROM missing_items_alerts a
      LEFT JOIN users u ON a.recipient_id = u.id
      LEFT JOIN requests r ON a.request_id = r.id
      WHERE a.is_completed = 0 
        AND julianday('now') - julianday(a.alert_sent_at) >= 1
      ORDER BY a.alert_sent_at ASC
    `).all();

    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل البيانات' });
  }
});

// POST mark alert as completed
router.post('/missing-alerts/:alertId/complete', adminMiddleware, (req, res) => {
  try {
    const alert = db.prepare('SELECT * FROM missing_items_alerts WHERE id = ?').get(req.params.alertId);
    if (!alert) return res.status(404).json({ error: 'التنبيه غير موجود' });

    db.prepare("UPDATE missing_items_alerts SET is_completed = 1, completed_at = datetime('now') WHERE id = ?")
      .run(req.params.alertId);

    // Also mark the request as no longer in 'missing' status if all documents are submitted
    const missingDocs = db.prepare(`
      SELECT COUNT(*) as c FROM request_documents 
      WHERE request_id = ? AND status = 'missing'
    `).get(alert.request_id);

    if (missingDocs.c === 0) {
      db.prepare("UPDATE requests SET status = 'file_submitted', updated_at = datetime('now') WHERE id = ?")
        .run(alert.request_id);
    }

    res.json({ message: 'تم تحديث حالة التنبيه' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// POST send reminder for 24-hour overdue alerts
router.post('/missing-alerts/:alertId/send-reminder', adminMiddleware, (req, res) => {
  try {
    const alert = db.prepare('SELECT * FROM missing_items_alerts WHERE id = ?').get(req.params.alertId);
    if (!alert) return res.status(404).json({ error: 'التنبيه غير موجود' });

    db.prepare("UPDATE missing_items_alerts SET reminder_sent_at = datetime('now') WHERE id = ?")
      .run(req.params.alertId);

    res.json({ 
      message: 'تم تسجيل إرسال التذكير',
      whatsapp_url: `https://wa.me/${alert.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent('تذكير: يرجى إكمال النواقص المطلوبة في أقرب وقت')}`
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// POST assign request to funding entity + contact
router.post('/requests/:id/assign-funding', adminMiddleware, (req, res) => {
  try {
    const { funding_entity_id, contact_id, note } = req.body;
    if (!funding_entity_id) return res.status(400).json({ error: 'الجهة التمويلية مطلوبة' });

    const request = db.prepare('SELECT id FROM requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    const entity = db.prepare('SELECT id, name FROM funding_entities WHERE id = ?').get(funding_entity_id);
    if (!entity) return res.status(404).json({ error: 'الجهة التمويلية غير موجودة' });

    let contactName = null;
    if (contact_id) {
      const contact = db.prepare('SELECT name FROM funding_entity_contacts WHERE id = ?').get(contact_id);
      contactName = contact?.name || null;
    }

    db.prepare(`UPDATE requests SET funding_entity_id = ?, status = 'submitted', updated_at = datetime('now') WHERE id = ?`)
      .run(funding_entity_id, req.params.id);

    const historyNote = [
      `تم إرسال الطلب إلى ${entity.name}`,
      contactName ? `المسؤول: ${contactName}` : null,
      note || null,
    ].filter(Boolean).join(' | ');

    db.prepare('INSERT INTO status_history (request_id, status, note, created_by) VALUES (?, ?, ?, ?)')
      .run(req.params.id, 'submitted', historyNote, req.user.id);

    res.json({ message: `تم إرسال الطلب إلى ${entity.name}` });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الإرسال: ' + err.message });
  }
});

// ===== FUNDING ENTITIES =====
router.get('/funding-entities', adminMiddleware, (req, res) => {
  try {
    const entities = db.prepare('SELECT * FROM funding_entities ORDER BY priority DESC').all();
    res.json(entities.map(e => ({
      ...e,
      product_types: JSON.parse(e.product_types || '[]'),
      required_documents: JSON.parse(e.required_documents || '[]'),
      additional_whatsapp_numbers: JSON.parse(e.additional_whatsapp_numbers || '[]')
    })));
  } catch (err) {
    res.status(500).json({ error: 'خطأ في استرجاع الجهات التمويلية' });
  }
});

router.post('/funding-entities', adminMiddleware, (req, res) => {
  try {
    const { name, priority, min_pos_amount, min_deposit_amount, min_transfer_amount, min_months, required_documents, notes, whatsapp_number, additional_whatsapp_numbers, product_types } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'اسم الجهة مطلوب' });

    const result = db.prepare(`
      INSERT INTO funding_entities (name, priority, min_pos_amount, min_deposit_amount, min_transfer_amount, min_months, required_documents, notes, whatsapp_number, additional_whatsapp_numbers, product_types)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(), priority || 0,
      min_pos_amount || 0, min_deposit_amount || 0, min_transfer_amount || 0,
      min_months || 6,
      JSON.stringify(required_documents || []),
      notes || '', whatsapp_number || '',
      JSON.stringify(additional_whatsapp_numbers || []),
      JSON.stringify(product_types || [])
    );

    res.status(201).json({ id: result.lastInsertRowid, message: 'تمت إضافة الجهة التمويلية' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الإضافة' });
  }
});

router.put('/funding-entities/:id', adminMiddleware, (req, res) => {
  try {
    const { name, priority, min_pos_amount, min_deposit_amount, min_transfer_amount, min_months, required_documents, notes, whatsapp_number, additional_whatsapp_numbers, product_types, is_active } = req.body;

    const entity = db.prepare('SELECT * FROM funding_entities WHERE id = ?').get(req.params.id);
    if (!entity) return res.status(404).json({ error: 'الجهة غير موجودة' });

    db.prepare(`
      UPDATE funding_entities SET
        name = ?, priority = ?, min_pos_amount = ?, min_deposit_amount = ?,
        min_transfer_amount = ?, min_months = ?, required_documents = ?,
        notes = ?, whatsapp_number = ?, additional_whatsapp_numbers = ?, product_types = ?, is_active = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? entity.name,
      priority ?? entity.priority,
      min_pos_amount ?? entity.min_pos_amount,
      min_deposit_amount ?? entity.min_deposit_amount,
      min_transfer_amount ?? entity.min_transfer_amount,
      min_months ?? entity.min_months,
      required_documents ? JSON.stringify(required_documents) : entity.required_documents,
      notes ?? entity.notes,
      whatsapp_number ?? entity.whatsapp_number,
      additional_whatsapp_numbers ? JSON.stringify(additional_whatsapp_numbers) : entity.additional_whatsapp_numbers,
      product_types ? JSON.stringify(product_types) : entity.product_types,
      is_active !== undefined ? (is_active ? 1 : 0) : entity.is_active,
      req.params.id
    );

    res.json({ message: 'تم تحديث الجهة التمويلية' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التحديث' });
  }
});

router.delete('/funding-entities/:id', adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM funding_entities WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم حذف الجهة التمويلية' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الحذف' });
  }
});

// ===== STATS =====
router.get('/stats', adminMiddleware, (req, res) => {
  try {
    const totalRequests = db.prepare('SELECT COUNT(*) as c FROM requests').get().c;
    const pendingUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'pending'").get().c;
    const fileSubmitted = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'file_submitted'").get().c;
    const approved = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'approved'").get().c;
    const feesReceived = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'fees_received'").get().c;
    const missing = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'missing'").get().c;
    res.json({ totalRequests, pendingUsers, fileSubmitted, approved, feesReceived, missing });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الإحصائيات' });
  }
});

// GET employees with their active requests (for send_to_funding modal)
router.get('/employees-with-requests', adminMiddleware, (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT
        u.id as user_id, u.name as user_name, u.phone as user_phone,
        u.role, u.partner_type,
        COUNT(r.id) as active_requests_count
      FROM users u
      LEFT JOIN requests r ON u.id = r.user_id
        AND r.status NOT IN ('approved', 'fees_received', 'rejected')
      WHERE u.role IN ('employee', 'partner', 'company')
        AND u.status = 'approved'
      GROUP BY u.id
      HAVING COUNT(r.id) > 0
      ORDER BY u.name
    `).all();

    const result = employees.map(emp => {
      const requests = db.prepare(`
        SELECT r.id, r.company_name, r.owner_name, r.owner_phone,
               r.status, r.funding_type, r.updated_at,
               fe.name as funding_entity_name,
               fe.whatsapp_number as fe_whatsapp
        FROM requests r
        LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id
        WHERE r.user_id = ?
          AND r.status NOT IN ('approved', 'fees_received', 'rejected')
        ORDER BY r.updated_at DESC
      `).all(emp.user_id);
      return { ...emp, requests };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل البيانات' });
  }
});

// GET pending alerts (missing requests + overdue requests)
router.get('/pending-alerts', adminMiddleware, (req, res) => {
  try {
    const missingAlerts = db.prepare(`
      SELECT
        r.id as request_id, r.company_name, r.owner_name, r.owner_phone,
        r.status, r.updated_at, r.funding_type,
        u.id as user_id, u.name as user_name, u.phone as user_phone, u.role as user_role,
        CAST((julianday('now') - julianday(r.updated_at)) * 24 AS INTEGER) as hours_elapsed,
        'missing' as alert_type,
        fe.name as funding_entity_name
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id
      WHERE r.status = 'missing'
      ORDER BY r.updated_at ASC
    `).all();

    const pendingAlerts = db.prepare(`
      SELECT
        r.id as request_id, r.company_name, r.owner_name, r.owner_phone,
        r.status, r.updated_at, r.funding_type,
        u.id as user_id, u.name as user_name, u.phone as user_phone, u.role as user_role,
        CAST((julianday('now') - julianday(r.updated_at)) * 24 AS INTEGER) as hours_elapsed,
        'pending' as alert_type,
        fe.name as funding_entity_name
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id
      WHERE r.status IN ('docs_pending', 'forms_sent', 'file_submitted', 'bank_uploaded', 'analyzed')
        AND julianday('now') - julianday(r.updated_at) >= 1
      ORDER BY r.updated_at ASC
    `).all();

    // Enrich missing alerts with latest reminder sent time
    const enrichedMissing = missingAlerts.map(a => {
      const lastAlert = db.prepare(`
        SELECT alert_sent_at, reminder_sent_at FROM missing_items_alerts
        WHERE request_id = ? AND is_completed = 0
        ORDER BY created_at DESC LIMIT 1
      `).get(a.request_id);

      const missingDocs = db.prepare(`
        SELECT document_name FROM request_documents
        WHERE request_id = ? AND status = 'missing'
      `).all(a.request_id);

      return {
        ...a,
        last_alert_sent: lastAlert?.reminder_sent_at || lastAlert?.alert_sent_at || null,
        missing_documents: missingDocs.map(d => d.document_name)
      };
    });

    res.json({
      total: missingAlerts.length + pendingAlerts.length,
      missing: enrichedMissing,
      pending: pendingAlerts
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل التنبيهات' });
  }
});

// POST mark alert as dismissed (move to next cycle)
router.post('/dismiss-alert/:requestId', adminMiddleware, (req, res) => {
  try {
    // Record that reminder was sent now
    const existing = db.prepare(`
      SELECT id FROM missing_items_alerts WHERE request_id = ? AND is_completed = 0 ORDER BY created_at DESC LIMIT 1
    `).get(req.params.requestId);

    if (existing) {
      db.prepare("UPDATE missing_items_alerts SET reminder_sent_at = datetime('now') WHERE id = ?")
        .run(existing.id);
    } else {
      const req2 = db.prepare('SELECT user_id, owner_phone FROM requests WHERE id = ?').get(req.params.requestId);
      if (req2) {
        db.prepare(`
          INSERT INTO missing_items_alerts (request_id, recipient_id, recipient_type, phone_number, created_by, reminder_sent_at)
          VALUES (?, ?, 'employee', ?, ?, datetime('now'))
        `).run(req.params.requestId, req2.user_id, req2.owner_phone || '', req.user.id);
      }
    }

    res.json({ message: 'تم تسجيل إرسال التذكير' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ: ' + err.message });
  }
});

// ===== PERMISSIONS =====

// POST reset permissions to defaults (Must be BEFORE :key route)
router.post('/permissions/reset', adminMiddleware, (req, res) => {
  try {
    const defaultPermissions = [
      { key: 'view_all_requests',    label: 'عرض جميع الطلبات',          description: 'يستطيع رؤية طلبات جميع الموظفين والشركاء',       category: 'الطلبات' },
      { key: 'update_request_status',label: 'تحديث حالة الطلبات',         description: 'يستطيع تغيير حالة أي طلب',                      category: 'الطلبات' },
      { key: 'send_missing_docs',    label: 'إرسال نواقص للموظف',         description: 'يستطيع طلب مستندات ناقصة من الموظف',            category: 'الطلبات' },
      { key: 'send_to_funding',      label: 'إرسال الملف للجهة التمويلية', description: 'يظهر له زر الإرسال عبر واتساب للجهة التمويلية', category: 'الإرسال' },
      { key: 'send_to_employee',     label: 'التواصل مع الموظف بالواتساب', description: 'يستطيع الضغط على زر واتساب الموظف',            category: 'الإرسال' },
      { key: 'approve_users',        label: 'الموافقة على المستخدمين',     description: 'يستطيع تفعيل أو حظر المستخدمين الجدد',         category: 'المستخدمون' },
      { key: 'manage_funding',       label: 'إدارة الجهات التمويلية',      description: 'يستطيع إضافة وتعديل وحذف الجهات التمويلية',    category: 'الجهات التمويلية' },
      { key: 'manage_settings',      label: 'الوصول للإعدادات',            description: 'يستطيع تعديل إعدادات المنصة والذكاء الاصطناعي', category: 'الإعدادات' },
    ];

    const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (key, label, description, category) VALUES (?, ?, ?, ?)');
    for (const p of defaultPermissions) {
      insertPerm.run(p.key, p.label, p.description, p.category);
    }
    
    const allPerms = db.prepare('SELECT * FROM permissions ORDER BY category, label').all();
    res.json({ message: 'تم إعادة تهيئة الصلاحيات', count: allPerms.length, permissions: allPerms });
  } catch (err) {
    console.error('Reset permissions error:', err);
    res.status(500).json({ error: 'خطأ في إعادة التهيئة: ' + err.message });
  }
});

// GET all available permissions
router.get('/permissions', adminMiddleware, (req, res) => {
  try {
    const permissions = db.prepare('SELECT * FROM permissions ORDER BY category, label').all();
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في استرجاع الصلاحيات' });
  }
});

// POST add new permission type
router.post('/permissions', adminMiddleware, (req, res) => {
  try {
    const { key, label, description, category } = req.body;
    if (!key || !label) return res.status(400).json({ error: 'المفتاح والاسم مطلوبان' });
    if (!/^[a-z_]+$/.test(key)) return res.status(400).json({ error: 'المفتاح يجب أن يكون بالإنجليزية وشرطات سفلية فقط' });

    const existing = db.prepare('SELECT id FROM permissions WHERE key = ?').get(key);
    if (existing) return res.status(409).json({ error: 'هذه الصلاحية موجودة بالفعل' });

    const result = db.prepare('INSERT INTO permissions (key, label, description, category) VALUES (?, ?, ?, ?)').run(key, label, description || '', category || 'عام');
    res.status(201).json({ id: result.lastInsertRowid, message: 'تم إضافة الصلاحية' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الإضافة' });
  }
});

// DELETE permission type
router.delete('/permissions/:key', adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM user_permissions WHERE permission_key = ?').run(req.params.key);
    db.prepare('DELETE FROM permissions WHERE key = ?').run(req.params.key);
    res.json({ message: 'تم حذف الصلاحية' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الحذف' });
  }
});

// GET user permissions
router.get('/users/:id/permissions', adminMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const allPermissions = db.prepare('SELECT * FROM permissions ORDER BY category, label').all();
    const userPerms = db.prepare('SELECT permission_key FROM user_permissions WHERE user_id = ?').all(req.params.id);
    const userPermKeys = userPerms.map(p => p.permission_key);

    res.json({ user, all_permissions: allPermissions, user_permissions: userPermKeys, is_admin: user.role === 'admin' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في استرجاع الصلاحيات' });
  }
});

// PUT set user permissions (full replace)
router.put('/users/:id/permissions', adminMiddleware, (req, res) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ error: 'قائمة صلاحيات غير صالحة' });

    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (user.role === 'admin') return res.status(400).json({ error: 'الأدمن يملك جميع الصلاحيات تلقائياً' });

    const doUpdate = db.transaction(() => {
      db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(req.params.id);
      const insert = db.prepare('INSERT INTO user_permissions (user_id, permission_key, granted_by) VALUES (?, ?, ?)');
      for (const key of permissions) {
        insert.run(req.params.id, key, req.user.id);
      }
    });
    doUpdate();

    res.json({ message: 'تم تحديث صلاحيات المستخدم' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث الصلاحيات' });
  }
});

// GET /api/auth/me also returns permissions — update auth route response
router.get('/users/:id/permissions-summary', adminMiddleware, (req, res) => {
  try {
    const perms = db.prepare(`
      SELECT p.key, p.label, p.category, up.granted_at
      FROM user_permissions up
      JOIN permissions p ON up.permission_key = p.key
      WHERE up.user_id = ?
      ORDER BY p.category
    `).all(req.params.id);
    res.json(perms);
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// ===== DELETE REQUESTS =====

// GET /admin/delete-requests — list all pending delete requests
router.get('/delete-requests', adminMiddleware, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT r.id, r.company_name, r.owner_name, r.owner_phone, r.entity_type,
             r.delete_reason, r.updated_at,
             u.name as user_name, u.phone as user_phone
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.status = 'delete_requested'
      ORDER BY r.updated_at DESC
    `).all();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// POST /admin/requests/:id/approve-delete
router.post('/requests/:id/approve-delete', adminMiddleware, (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM requests WHERE id = ? AND status = ?').get(req.params.id, 'delete_requested');
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود أو لم يُطلب حذفه' });

    // Keep company data in companies table (already saved), just delete the request
    db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);

    res.json({ message: 'تم حذف الطلب بنجاح بعد الموافقة' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف الطلب' });
  }
});

// POST /admin/requests/:id/reject-delete
router.post('/requests/:id/reject-delete', adminMiddleware, (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    const { restore_status = 'draft', guidance } = req.body;
    if (!guidance || !guidance.trim()) return res.status(400).json({ error: 'يرجى كتابة التوجيهات للموظف' });

    db.prepare(`UPDATE requests SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(restore_status, req.params.id);
    db.prepare('INSERT INTO status_history (request_id, status, note, created_by) VALUES (?, ?, ?, ?)')
      .run(req.params.id, restore_status, `❌ رُفض طلب الحذف — توجيهات المدير:\n${guidance.trim()}`, req.user.id);

    res.json({ message: 'تم رفض طلب الحذف وإرسال التوجيهات' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// ===== BROKERS (added by employees) =====
router.get('/brokers', adminMiddleware, (req, res) => {
  try {
    const brokers = db.prepare(`
      SELECT b.*, u.name as added_by_name, u.role as added_by_role
      FROM brokers b
      LEFT JOIN users u ON b.added_by_id = u.id
      ORDER BY b.created_at DESC
    `).all();
    res.json(brokers);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في استرجاع الوسطاء' });
  }
});

// ===== CONTRACTS =====
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const contractStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/contracts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  }
});
const contractUploadAdmin = multer({ storage: contractStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET /admin/contracts — all contracts grouped by company
router.get('/contracts', adminMiddleware, (req, res) => {
  try {
    const contracts = db.prepare(`
      SELECT c.*,
             r.company_name, r.entity_type, r.funding_type,
             fe.name as funding_entity_name,
             u.name as uploaded_by_name, u.role as uploaded_by_role
      FROM contracts c
      LEFT JOIN requests r ON c.request_id = r.id
      LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id
      LEFT JOIN users u ON c.uploaded_by = u.id
      ORDER BY c.created_at DESC
    `).all();
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في استرجاع العقود' });
  }
});

// GET /admin/contracts/request/:requestId — contracts for a specific request
router.get('/contracts/request/:requestId', adminMiddleware, (req, res) => {
  try {
    const contracts = db.prepare(`
      SELECT c.*, u.name as uploaded_by_name
      FROM contracts c
      LEFT JOIN users u ON c.uploaded_by = u.id
      WHERE c.request_id = ?
      ORDER BY c.created_at DESC
    `).all(req.params.requestId);
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// POST /admin/requests/:id/send-forms — admin sends forms to employee
router.post('/requests/:id/send-forms', adminMiddleware, (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    db.prepare("UPDATE requests SET status = 'forms_ready', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    db.prepare('INSERT INTO status_history (request_id, status, note, created_by) VALUES (?, ?, ?, ?)').run(
      req.params.id, 'forms_ready', 'تم إرسال النماذج للموظف من قِبل المدير', req.user.id
    );

    res.json({ message: 'تم إرسال النماذج للموظف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// ===== PERFORMANCE =====

// GET /admin/performance — overview of all employees/partners
router.get('/performance', adminMiddleware, (req, res) => {
  try {
    const { month } = req.query; // e.g. '2026-04'
    let dateFilter = '';
    const params = [];
    if (month) {
      dateFilter = "AND strftime('%Y-%m', r.created_at) = ?";
      params.push(month);
    }

    const users = db.prepare(`
      SELECT id, name, role, partner_type, phone, status, created_at
      FROM users
      WHERE role IN ('employee', 'partner') AND status = 'approved'
      ORDER BY role, name
    `).all();

    const result = users.map(u => {
      const allReqs = db.prepare(`
        SELECT id, status, created_at, updated_at, company_name, funding_type
        FROM requests WHERE user_id = ? ${dateFilter}
      `).all(u.id, ...params);

      const statusGroups = {
        draft:       allReqs.filter(r => ['draft','bank_uploaded'].includes(r.status)).length,
        in_progress: allReqs.filter(r => ['analyzing','analyzed','docs_pending','docs_ready','contract_submitted','forms_ready','forms_sent','file_submitted','missing_submitted','contract_received'].includes(r.status)).length,
        submitted:   allReqs.filter(r => r.status === 'submitted').length,
        approved:    allReqs.filter(r => ['approved','transferred','fees_received'].includes(r.status)).length,
        missing:     allReqs.filter(r => r.status === 'missing').length,
        rejected:    allReqs.filter(r => r.status === 'rejected').length,
        total:       allReqs.length,
      };

      // Attendance this month
      const attendanceMonth = month || new Date().toISOString().slice(0,7);
      const attendanceDays = db.prepare(`
        SELECT COUNT(*) as c FROM attendance
        WHERE user_id = ? AND strftime('%Y-%m', date) = ?
      `).get(u.id, attendanceMonth).c;

      // Brokers added
      const brokersAdded = db.prepare(`
        SELECT COUNT(*) as c FROM brokers WHERE added_by_id = ?
        ${month ? "AND strftime('%Y-%m', created_at) = ?" : ''}
      `).get(u.id, ...(month ? [month] : [])).c;

      // Missing pending (regardless of month)
      const missingPending = db.prepare(`
        SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND status = 'missing'
      `).get(u.id).c;

      // Conversion rate
      const conversionRate = statusGroups.total > 0
        ? Math.round((statusGroups.approved / statusGroups.total) * 100)
        : 0;

      // Last active request
      const lastReq = allReqs.sort((a,b) => new Date(b.updated_at)-new Date(a.updated_at))[0];

      return {
        ...u,
        stats: { ...statusGroups, attendance_days: attendanceDays, brokers_added: brokersAdded, missing_pending: missingPending, conversion_rate: conversionRate },
        last_request: lastReq ? { company: lastReq.company_name, status: lastReq.status, date: lastReq.updated_at } : null,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الأداء: ' + err.message });
  }
});

// GET /admin/performance/:userId — detailed breakdown for one user
router.get('/performance/:userId', adminMiddleware, (req, res) => {
  try {
    const { month } = req.query;
    const user = db.prepare('SELECT id, name, role, partner_type, phone, status, created_at FROM users WHERE id = ?').get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    let dateFilter = '';
    const params = [user.id];
    if (month) { dateFilter = "AND strftime('%Y-%m', r.created_at) = ?"; params.push(month); }

    const requests = db.prepare(`
      SELECT r.id, r.company_name, r.owner_name, r.status, r.funding_type,
             r.created_at, r.updated_at,
             fe.name as funding_entity_name
      FROM requests r
      LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id
      WHERE r.user_id = ? ${dateFilter}
      ORDER BY r.updated_at DESC
    `).all(...params);

    // Monthly breakdown (last 6 months)
    const monthly = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
             COUNT(*) as total,
             SUM(CASE WHEN status IN ('approved','transferred','fees_received') THEN 1 ELSE 0 END) as approved,
             SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM requests WHERE user_id = ?
      GROUP BY month ORDER BY month DESC LIMIT 6
    `).all(user.id);

    // Attendance last 30 days
    const attendance = db.prepare(`
      SELECT date, check_in, check_out FROM attendance
      WHERE user_id = ? ORDER BY date DESC LIMIT 30
    `).all(user.id);

    res.json({ user, requests, monthly, attendance });
  } catch (err) {
    res.status(500).json({ error: 'خطأ: ' + err.message });
  }
});

// POST /admin/requests/:id/upload-funding-contract — admin uploads funding contract
router.post('/requests/:id/upload-funding-contract', adminMiddleware, contractUploadAdmin.single('file'), (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });

    // Save to contracts table
    db.prepare(
      'INSERT INTO contracts (request_id, contract_type, file_path, file_name, uploaded_by, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.params.id, 'funding', req.file.path, req.file.originalname, req.user.id, req.body.notes || null);

    // Update request
    db.prepare(`
      UPDATE requests SET
        funding_contract_path = ?,
        funding_contract_name = ?,
        status = 'contract_received',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(req.file.path, req.file.originalname, req.params.id);

    db.prepare('INSERT INTO status_history (request_id, status, note, created_by) VALUES (?, ?, ?, ?)').run(
      req.params.id, 'contract_received', 'تم استلام عقد التمويل وحفظه من قِبل المدير', req.user.id
    );

    res.json({ message: 'تم رفع عقد التمويل بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في رفع عقد التمويل' });
  }
});

// ===== DASHBOARD STATS =====
router.get('/dashboard-stats', adminMiddleware, (req, res) => {
  try {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const thisYear = now.getFullYear().toString();

    const thisRev  = db.prepare("SELECT COALESCE(SUM(commission_amount),0) as r, COUNT(*) as c FROM requests WHERE status='fees_received' AND strftime('%Y-%m',updated_at)=?").get(thisMonth);
    const lastRev  = db.prepare("SELECT COALESCE(SUM(commission_amount),0) as r FROM requests WHERE status='fees_received' AND strftime('%Y-%m',updated_at)=?").get(lastMonth);
    const ytd      = db.prepare("SELECT COALESCE(SUM(commission_amount),0) as r, COUNT(*) as c FROM requests WHERE status='fees_received' AND strftime('%Y',updated_at)=?").get(thisYear);
    const pipeline = db.prepare("SELECT COALESCE(SUM(commission_amount),0) as r FROM requests WHERE status NOT IN ('fees_received','rejected') AND commission_amount>0").get().r;
    const trendPct = lastRev.r > 0 ? Math.round(((thisRev.r - lastRev.r) / lastRev.r) * 100) : null;

    const stages = db.prepare("SELECT status, COUNT(*) as count FROM requests GROUP BY status ORDER BY count DESC").all();

    const pendingUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE status='pending'").get().c;
    const missingDocs  = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status='missing'").get().c;
    const overdue      = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status IN ('docs_pending','file_submitted','forms_sent','bank_uploaded','analyzed','submitted') AND julianday('now')-julianday(updated_at)>3").get().c;

    const topPerformers = db.prepare(`
      SELECT u.id, u.name, u.role,
        COUNT(r.id) as total,
        SUM(CASE WHEN r.status IN ('approved','transferred','fees_received') THEN 1 ELSE 0 END) as approved,
        COALESCE(SUM(CASE WHEN r.status='fees_received' THEN r.commission_amount ELSE 0 END),0) as revenue
      FROM users u
      LEFT JOIN requests r ON u.id=r.user_id AND strftime('%Y-%m',r.created_at)=?
      WHERE u.role IN ('employee','partner') AND u.status='approved'
      GROUP BY u.id ORDER BY approved DESC, total DESC LIMIT 5
    `).all(thisMonth);

    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.toISOString().slice(0, 7);
      const rev  = db.prepare("SELECT COALESCE(SUM(commission_amount),0) as r, COUNT(*) as c FROM requests WHERE status='fees_received' AND strftime('%Y-%m',updated_at)=?").get(m);
      const newR = db.prepare("SELECT COUNT(*) as c FROM requests WHERE strftime('%Y-%m',created_at)=?").get(m).c;
      monthlyTrend.push({ month: m, revenue: rev.r, closed: rev.c, new_requests: newR });
    }

    const teamTarget  = db.prepare("SELECT COALESCE(SUM(target_requests),0) as tr, COALESCE(SUM(target_approved),0) as ta, COALESCE(SUM(target_revenue),0) as rv FROM targets WHERE month=?").get(thisMonth);
    const teamActuals = db.prepare("SELECT COUNT(*) as tr, SUM(CASE WHEN status IN ('approved','transferred','fees_received') THEN 1 ELSE 0 END) as ta, COALESCE(SUM(CASE WHEN status='fees_received' THEN commission_amount ELSE 0 END),0) as rv FROM requests WHERE strftime('%Y-%m',created_at)=?").get(thisMonth);

    const recentRequests = db.prepare(`
      SELECT r.id, r.company_name, r.status, r.funding_type, r.updated_at, r.commission_amount,
        u.name as user_name, fe.name as entity_name
      FROM requests r
      LEFT JOIN users u ON r.user_id=u.id
      LEFT JOIN funding_entities fe ON r.funding_entity_id=fe.id
      ORDER BY r.updated_at DESC LIMIT 6
    `).all();

    res.json({
      revenue: { this_month: thisRev.r, this_month_count: thisRev.c, last_month: lastRev.r, ytd: ytd.r, ytd_count: ytd.c, pipeline, trend_pct: trendPct },
      stages, actions: { pending_users: pendingUsers, missing_docs: missingDocs, overdue },
      top_performers: topPerformers, monthly_trend: monthlyTrend,
      targets: { target: teamTarget, actual: teamActuals },
      recent_requests: recentRequests,
    });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ===== REPORTS =====
router.get('/reports', adminMiddleware, (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear().toString();
    const monthly = [];
    for (let m = 1; m <= 12; m++) {
      const month = `${year}-${String(m).padStart(2, '0')}`;
      const closed  = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(commission_amount),0) as r FROM requests WHERE status='fees_received' AND strftime('%Y-%m',updated_at)=?").get(month);
      const newR    = db.prepare("SELECT COUNT(*) as c FROM requests WHERE strftime('%Y-%m',created_at)=?").get(month).c;
      const approved= db.prepare("SELECT COUNT(*) as c FROM requests WHERE status IN ('approved','transferred','fees_received') AND strftime('%Y-%m',updated_at)=?").get(month).c;
      monthly.push({ month, closed: closed.c, revenue: closed.r, new_requests: newR, approved });
    }

    const funnel   = db.prepare("SELECT status, COUNT(*) as count FROM requests GROUP BY status ORDER BY count DESC").all();
    const entities = db.prepare(`
      SELECT fe.name, COUNT(r.id) as total_sent,
        SUM(CASE WHEN r.status IN ('approved','transferred','fees_received') THEN 1 ELSE 0 END) as approved,
        COALESCE(SUM(CASE WHEN r.status='fees_received' THEN r.commission_amount ELSE 0 END),0) as revenue
      FROM funding_entities fe LEFT JOIN requests r ON r.funding_entity_id=fe.id
      GROUP BY fe.id HAVING COUNT(r.id)>0 ORDER BY approved DESC LIMIT 10
    `).all();
    const topUsers = db.prepare(`
      SELECT u.name, u.role, COUNT(r.id) as total,
        SUM(CASE WHEN r.status IN ('approved','transferred','fees_received') THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN r.status='rejected' THEN 1 ELSE 0 END) as rejected,
        COALESCE(SUM(CASE WHEN r.status='fees_received' THEN r.commission_amount ELSE 0 END),0) as revenue
      FROM users u LEFT JOIN requests r ON u.id=r.user_id AND strftime('%Y',r.created_at)=?
      WHERE u.role IN ('employee','partner')
      GROUP BY u.id ORDER BY approved DESC, total DESC LIMIT 10
    `).all(year);
    const closedDeals = db.prepare(`
      SELECT r.id, r.company_name, r.funding_type, r.commission_amount, r.updated_at,
        u.name as user_name, fe.name as entity_name
      FROM requests r
      LEFT JOIN users u ON r.user_id=u.id
      LEFT JOIN funding_entities fe ON r.funding_entity_id=fe.id
      WHERE r.status='fees_received' AND strftime('%Y',r.updated_at)=?
      ORDER BY r.updated_at DESC
    `).all(year);

    res.json({ monthly, funnel, entities, top_users: topUsers, closed_deals: closedDeals });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ===== TARGETS =====
router.get('/targets', adminMiddleware, (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const users = db.prepare("SELECT id, name, role FROM users WHERE role IN ('employee','partner') AND status='approved' ORDER BY name").all();
    const result = users.map(u => {
      const target = db.prepare('SELECT * FROM targets WHERE user_id=? AND month=?').get(u.id, month) || { target_requests: 0, target_approved: 0, target_revenue: 0 };
      const actual = db.prepare("SELECT COUNT(*) as requests, SUM(CASE WHEN status IN ('approved','transferred','fees_received') THEN 1 ELSE 0 END) as approved, COALESCE(SUM(CASE WHEN status='fees_received' THEN commission_amount ELSE 0 END),0) as revenue FROM requests WHERE user_id=? AND strftime('%Y-%m',created_at)=?").get(u.id, month);
      return { ...u, target, actual };
    });
    res.json(result);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.put('/targets/:userId/:month', adminMiddleware, (req, res) => {
  try {
    const { target_requests, target_approved, target_revenue } = req.body;
    db.prepare(`
      INSERT INTO targets (user_id, month, target_requests, target_approved, target_revenue, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, month) DO UPDATE SET
        target_requests=excluded.target_requests,
        target_approved=excluded.target_approved,
        target_revenue=excluded.target_revenue
    `).run(req.params.userId, req.params.month, target_requests||0, target_approved||0, target_revenue||0, req.user.id);
    res.json({ message: 'تم حفظ الهدف' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.delete('/targets/:userId/:month', adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM targets WHERE user_id = ? AND month = ?').run(req.params.userId, req.params.month);
    res.json({ message: 'تم حذف الهدف' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.put('/requests/:id/commission', adminMiddleware, (req, res) => {
  try {
    const amount = parseFloat(req.body.commission_amount);
    if (isNaN(amount) || amount < 0) return res.status(400).json({ error: 'مبلغ غير صالح' });
    db.prepare('UPDATE requests SET commission_amount=? WHERE id=?').run(amount, req.params.id);
    res.json({ message: 'تم تحديث العمولة', commission_amount: amount });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
