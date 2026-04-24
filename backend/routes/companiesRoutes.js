const express = require('express');
const db = require('../database');
const { adminMiddleware, authMiddleware, hasAnyPermission, hasPermission } = require('../middleware/authMiddleware');

const router = express.Router();

const PRODUCT_TYPES = ['كاش', 'نقاط بيع', 'عقار', 'تمويل شخصي', 'أسطول', 'رهن', 'تمويل تجاري'];

// ===== CONTACTS =====
router.get('/contacts', hasAnyPermission(['manage_funding', 'send_to_funding']), async (req, res) => {
  try {
    const { entity_id } = req.query;
    let contacts;
    if (entity_id) {
      contacts = await db.prepare(`SELECT fc.*, fe.name as entity_name FROM funding_entity_contacts fc JOIN funding_entities fe ON fc.funding_entity_id = fe.id WHERE fc.funding_entity_id = ? ORDER BY fc.name`).all(entity_id);
    } else {
      contacts = await db.prepare(`SELECT fc.*, fe.name as entity_name FROM funding_entity_contacts fc JOIN funding_entities fe ON fc.funding_entity_id = fe.id ORDER BY fe.name, fc.name`).all();
    }
    res.json(contacts.map(c => ({ ...c, product_types: JSON.parse(c.product_types || '[]') })));
  } catch (err) { res.status(500).json({ error: 'خطأ في استرجاع جهات الاتصال' }); }
});

router.post('/contacts', hasPermission('manage_funding'), async (req, res) => {
  try {
    const { funding_entity_id, name, phone, product_types, notes } = req.body;
    if (!funding_entity_id || !name?.trim()) return res.status(400).json({ error: 'الجهة التمويلية والاسم مطلوبان' });
    const entity = await db.prepare('SELECT id FROM funding_entities WHERE id = ?').get(funding_entity_id);
    if (!entity) return res.status(404).json({ error: 'الجهة التمويلية غير موجودة' });
    const result = await db.prepare(`INSERT INTO funding_entity_contacts (funding_entity_id, name, phone, product_types, notes) VALUES (?, ?, ?, ?, ?)`).run(funding_entity_id, name.trim(), phone || null, JSON.stringify(Array.isArray(product_types) ? product_types : []), notes || null);
    res.status(201).json({ id: result.lastInsertRowid, message: 'تمت إضافة جهة الاتصال' });
  } catch (err) { res.status(500).json({ error: 'خطأ في الإضافة' }); }
});

router.put('/contacts/:id', hasPermission('manage_funding'), async (req, res) => {
  try {
    const { name, phone, product_types, notes, is_active, funding_entity_id } = req.body;
    const contact = await db.prepare('SELECT * FROM funding_entity_contacts WHERE id = ?').get(req.params.id);
    if (!contact) return res.status(404).json({ error: 'جهة الاتصال غير موجودة' });
    await db.prepare(`UPDATE funding_entity_contacts SET funding_entity_id = ?, name = ?, phone = ?, product_types = ?, notes = ?, is_active = ?, updated_at = NOW() WHERE id = ?`).run(
      funding_entity_id ?? contact.funding_entity_id, name?.trim() ?? contact.name, phone ?? contact.phone,
      product_types ? JSON.stringify(product_types) : contact.product_types,
      notes ?? contact.notes, is_active !== undefined ? (is_active ? 1 : 0) : contact.is_active, req.params.id
    );
    res.json({ message: 'تم التحديث' });
  } catch (err) { res.status(500).json({ error: 'خطأ في التحديث' }); }
});

router.delete('/contacts/:id', hasPermission('manage_funding'), async (req, res) => {
  try {
    await db.prepare('DELETE FROM funding_entity_contacts WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم الحذف' });
  } catch (err) { res.status(500).json({ error: 'خطأ في الحذف' }); }
});

router.get('/product-types', authMiddleware, (req, res) => { res.json(PRODUCT_TYPES); });

// ===== COMPANIES =====
router.get('/companies', hasPermission('manage_establishments'), async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT c.*, u.name as employee_name, u.phone as employee_phone, r.status as request_status, r.funding_entity_id, fe.name as funding_entity_name FROM companies c LEFT JOIN users u ON c.user_id = u.id LEFT JOIN requests r ON c.request_id = r.id LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id`;
    const params = [];
    if (search) { query += ' WHERE c.company_name ILIKE $1 OR c.owner_name ILIKE $1 OR c.owner_phone ILIKE $1'; params.push(`%${search}%`); }
    query += ' ORDER BY c.created_at DESC';
    const companies = (await db.query(query, params)).rows;
    res.json(companies);
  } catch (err) { res.status(500).json({ error: 'خطأ في استرجاع المنشآت' }); }
});

router.post('/companies', hasPermission('manage_establishments'), async (req, res) => {
  try {
    const { company_name, owner_name, owner_phone, entity_type } = req.body;
    if (!company_name?.trim()) return res.status(400).json({ error: 'اسم المنشأة مطلوب' });
    const result = await db.prepare(`INSERT INTO companies (company_name, owner_name, owner_phone, entity_type, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`).run(company_name.trim(), owner_name?.trim() || null, owner_phone?.trim() || null, entity_type || 'شركة');
    res.status(201).json({ id: result.lastInsertRowid, message: 'تمت إضافة المنشأة' });
  } catch (err) { res.status(500).json({ error: 'خطأ في إضافة المنشأة' }); }
});

router.put('/companies/:id', hasPermission('manage_establishments'), async (req, res) => {
  try {
    const { company_name, owner_name, owner_phone, entity_type } = req.body;
    await db.prepare(`UPDATE companies SET company_name = COALESCE(?, company_name), owner_name = COALESCE(?, owner_name), owner_phone = COALESCE(?, owner_phone), entity_type = COALESCE(?, entity_type), updated_at = NOW() WHERE id = ?`).run(company_name || null, owner_name || null, owner_phone || null, entity_type || null, req.params.id);
    res.json({ message: 'تم التحديث' });
  } catch (err) { res.status(500).json({ error: 'خطأ في التحديث' }); }
});

router.post('/companies/bulk-delete', hasPermission('manage_establishments'), async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (ids.length === 0) return res.status(400).json({ error: 'لم يتم تحديد منشآت للحذف' });

    let deletedCount = 0;

    for (const id of ids) {
      const company = await db.prepare('SELECT id FROM companies WHERE id = ?').get(id);
      if (!company) continue;
      await db.prepare('DELETE FROM companies WHERE id = ?').run(id);
      deletedCount += 1;
    }

    res.json({ message: `تم حذف ${deletedCount} منشأة`, deletedCount });
  } catch (err) { res.status(500).json({ error: 'خطأ في الحذف الجماعي' }); }
});

router.delete('/companies/:id', hasPermission('manage_establishments'), async (req, res) => {
  try {
    const company = await db.prepare('SELECT id, user_id FROM companies WHERE id = ?').get(req.params.id);
    if (!company) return res.status(404).json({ error: 'المنشأة غير موجودة' });
    await db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم الحذف' });
  } catch (err) { res.status(500).json({ error: 'خطأ في الحذف' }); }
});

// ===== EMPLOYEE STATS =====
router.get('/employee-stats', adminMiddleware, async (req, res) => {
  try {
    const employees = await db.prepare(`SELECT u.id, u.name, u.email, u.phone, u.role, u.partner_type, u.status, u.created_at FROM users u WHERE u.role != 'admin' ORDER BY u.name`).all();
    const stats = await Promise.all(employees.map(async emp => {
      const [totalRow, inProgressRow, completedRow, approvedRow, rejectedRow, missingRow, lastRow, activeReqs, rejectedReqs] = await Promise.all([
        db.prepare('SELECT COUNT(*) as c FROM requests WHERE user_id = ?').get(emp.id),
        db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND status NOT IN ('fees_received','rejected','draft')").get(emp.id),
        db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND status = 'fees_received'").get(emp.id),
        db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND status = 'approved'").get(emp.id),
        db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND status = 'rejected'").get(emp.id),
        db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND status = 'missing'").get(emp.id),
        db.prepare('SELECT MAX(updated_at) as last_at FROM requests WHERE user_id = ?').get(emp.id),
        db.prepare(`SELECT r.id, r.company_name, r.status, r.entity_type, fe.name as funding_entity_name FROM requests r LEFT JOIN funding_entities fe ON r.funding_entity_id = fe.id WHERE r.user_id = ? AND r.status NOT IN ('fees_received','rejected','draft') ORDER BY r.updated_at DESC LIMIT 5`).all(emp.id),
        db.prepare("SELECT r.id, r.company_name, r.rejection_reason, r.updated_at FROM requests r WHERE r.user_id = ? AND r.status = 'rejected' ORDER BY r.updated_at DESC").all(emp.id),
      ]);
      return { ...emp, stats: { totalReqs: totalRow.c, inProgress: inProgressRow.c, completed: completedRow.c, approved: approvedRow.c, rejected: rejectedRow.c, missing: missingRow.c }, last_activity: lastRow?.last_at || null, active_requests: activeReqs, rejected_requests: rejectedReqs };
    }));
    res.json(stats);
  } catch (err) { console.error(err); res.status(500).json({ error: 'خطأ في استرجاع إحصائيات الموظفين' }); }
});

router.get('/team-overview', adminMiddleware, async (req, res) => {
  try {
    const INACTIVE_DAYS = 30;

    const empRows = await db.prepare(`SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at, COUNT(r.id) as total_requests, MAX(r.updated_at) as last_activity FROM users u LEFT JOIN requests r ON u.id = r.user_id WHERE u.role = 'employee' GROUP BY u.id ORDER BY total_requests DESC, u.name`).all();
    const employees = await Promise.all(empRows.map(async e => ({
      ...e,
      in_progress: (await db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND status NOT IN ('fees_received','rejected','draft')").get(e.id)).c,
      completed: (await db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND status IN ('fees_received','approved')").get(e.id)).c,
    })));

    const partnerRows = await db.prepare(`SELECT u.id, u.name, u.email, u.phone, u.partner_type, u.status, u.created_at, COUNT(r.id) as total_requests, MAX(r.updated_at) as last_activity FROM users u LEFT JOIN requests r ON u.id = r.user_id WHERE u.role IN ('partner', 'company') GROUP BY u.id ORDER BY last_activity DESC NULLS LAST, u.name`).all();
    const partners = await Promise.all(partnerRows.map(async p => {
      const daysSince = p.last_activity ? Math.floor((Date.now() - new Date(p.last_activity).getTime()) / 86400000) : null;
      return { ...p,
        in_progress: (await db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND status NOT IN ('fees_received','rejected','draft')").get(p.id)).c,
        completed: (await db.prepare("SELECT COUNT(*) as c FROM requests WHERE user_id = ? AND status IN ('fees_received','approved')").get(p.id)).c,
        days_since_activity: daysSince, is_active: daysSince !== null ? daysSince < INACTIVE_DAYS : false
      };
    }));

    const fundingEntities = await db.prepare(`SELECT fe.id, fe.name, fe.priority, fe.is_active, fe.whatsapp_number, COUNT(r.id) as total_submitted, SUM(CASE WHEN r.status IN ('file_submitted','submitted','approved','transferred','fees_received') THEN 1 ELSE 0 END) as submitted_count, SUM(CASE WHEN r.status = 'approved' THEN 1 ELSE 0 END) as approved_count, SUM(CASE WHEN r.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count, SUM(CASE WHEN r.status = 'missing' THEN 1 ELSE 0 END) as missing_count, MAX(r.updated_at) as last_submission FROM funding_entities fe LEFT JOIN requests r ON fe.id = r.funding_entity_id WHERE fe.is_active = 1 GROUP BY fe.id ORDER BY total_submitted DESC, fe.priority DESC`).all();

    res.json({ employees, partners: { all: partners, active: partners.filter(p => p.is_active), inactive: partners.filter(p => !p.is_active) }, funding_entities: fundingEntities, inactive_threshold_days: INACTIVE_DAYS });
  } catch (err) { console.error(err); res.status(500).json({ error: 'خطأ في تحميل البيانات: ' + err.message }); }
});

// ===== ESTABLISHMENTS (Employee/Partner) =====
router.get('/establishments', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    let query, params;
    if (req.user.role === 'admin') {
      query = `SELECT c.*, u.name as added_by_name, u.role as added_by_role FROM companies c LEFT JOIN users u ON c.user_id = u.id`;
      params = [];
      if (search) { query += ` WHERE c.company_name ILIKE $1 OR c.owner_name ILIKE $1 OR c.owner_phone ILIKE $1`; params.push(`%${search}%`); }
    } else {
      query = `SELECT c.*, u.name as added_by_name, u.role as added_by_role FROM companies c LEFT JOIN users u ON c.user_id = u.id WHERE c.user_id = $1`;
      params = [req.user.id];
      if (search) { query += ` AND (c.company_name ILIKE $2 OR c.owner_name ILIKE $2 OR c.owner_phone ILIKE $2)`; params.push(`%${search}%`); }
    }
    query += ' ORDER BY c.created_at DESC';
    const rows = (await db.query(query, params)).rows;
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'خطأ في استرجاع المنشآت' }); }
});

router.post('/establishments', authMiddleware, async (req, res) => {
  try {
    const { company_name, owner_name, owner_phone, entity_type } = req.body;
    if (!company_name?.trim()) return res.status(400).json({ error: 'اسم المنشأة مطلوب' });
    const result = await db.prepare(
      `INSERT INTO companies (company_name, owner_name, owner_phone, entity_type, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`
    ).run(company_name.trim(), owner_name?.trim() || null, owner_phone?.trim() || null, entity_type || 'شركة', req.user.id);
    res.status(201).json({ id: result.lastInsertRowid, message: 'تمت إضافة المنشأة بنجاح' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'خطأ في إضافة المنشأة' }); }
});

router.delete('/establishments/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'حذف المنشآت متاح للمدير فقط' });
    }
    const company = await db.prepare('SELECT id FROM companies WHERE id = ?').get(req.params.id);
    if (!company) return res.status(404).json({ error: 'المنشأة غير موجودة' });
    await db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم الحذف' });
  } catch (err) { res.status(500).json({ error: 'خطأ في الحذف' }); }
});

module.exports = router;
