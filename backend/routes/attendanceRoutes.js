const express = require('express');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// GET today's record for logged-in user
router.get('/today', authMiddleware, (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const record = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);
    res.json(record || null);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب سجل اليوم' });
  }
});

// POST check-in
router.post('/check-in', authMiddleware, (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const existing = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);
    if (existing) return res.status(400).json({ error: 'تم تسجيل الحضور مسبقاً اليوم' });

    const { lat, lng, address } = req.body;
    const result = db.prepare(`
      INSERT INTO attendance (user_id, date, check_in, check_in_lat, check_in_lng, check_in_address)
      VALUES (?, ?, datetime('now', 'localtime'), ?, ?, ?)
    `).run(req.user.id, today, lat || null, lng || null, address || null);

    const record = db.prepare('SELECT * FROM attendance WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'تم تسجيل الحضور', record });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تسجيل الحضور: ' + err.message });
  }
});

// PUT check-out
router.put('/check-out', authMiddleware, (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const record = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);
    if (!record) return res.status(400).json({ error: 'لم يتم تسجيل الحضور بعد' });
    if (record.check_out) return res.status(400).json({ error: 'تم تسجيل الانصراف مسبقاً' });

    const { lat, lng, address } = req.body;
    db.prepare(`
      UPDATE attendance SET check_out = datetime('now', 'localtime'), check_out_lat = ?, check_out_lng = ?, check_out_address = ?
      WHERE id = ?
    `).run(lat || null, lng || null, address || null, record.id);

    const updated = db.prepare('SELECT * FROM attendance WHERE id = ?').get(record.id);
    res.json({ message: 'تم تسجيل الانصراف', record: updated });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تسجيل الانصراف: ' + err.message });
  }
});

// GET my attendance history (last 30 days)
router.get('/my', authMiddleware, (req, res) => {
  try {
    const records = db.prepare(`
      SELECT * FROM attendance WHERE user_id = ?
      ORDER BY date DESC LIMIT 60
    `).all(req.user.id);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب السجلات' });
  }
});

// ===== ADMIN =====

// GET all attendance (with filters)
router.get('/admin/all', adminMiddleware, (req, res) => {
  try {
    const { date_from, date_to, user_id } = req.query;
    let query = `
      SELECT a.*, u.name as user_name, u.role as user_role
      FROM attendance a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (date_from) { query += ' AND a.date >= ?'; params.push(date_from); }
    if (date_to)   { query += ' AND a.date <= ?'; params.push(date_to); }
    if (user_id)   { query += ' AND a.user_id = ?'; params.push(user_id); }
    query += ' ORDER BY a.date DESC, a.check_in DESC LIMIT 500';
    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب السجلات' });
  }
});

// GET today's summary for admin
router.get('/admin/today', adminMiddleware, (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const records = db.prepare(`
      SELECT a.*, u.name as user_name, u.role as user_role, u.phone as user_phone
      FROM attendance a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.date = ?
      ORDER BY a.check_in ASC
    `).all(today);

    const totalEmployees = db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin' AND status = 'approved'").get().c;

    res.json({ records, total_employees: totalEmployees, present: records.length, absent: totalEmployees - records.length });
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// DELETE record (admin only)
router.delete('/admin/:id', adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM attendance WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم الحذف' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الحذف' });
  }
});

module.exports = router;
