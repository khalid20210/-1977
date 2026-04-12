const express = require('express');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const record = await db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);
    res.json(record || null);
  } catch (err) { res.status(500).json({ error: 'خطأ في جلب سجل اليوم' }); }
});

router.post('/check-in', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const existing = await db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);
    if (existing) return res.status(400).json({ error: 'تم تسجيل الحضور مسبقاً اليوم' });
    const { lat, lng, address } = req.body;
    const result = await db.prepare(`INSERT INTO attendance (user_id, date, check_in, check_in_lat, check_in_lng, check_in_address) VALUES (?, ?, NOW(), ?, ?, ?)`).run(req.user.id, today, lat || null, lng || null, address || null);
    const record = await db.prepare('SELECT * FROM attendance WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'تم تسجيل الحضور', record });
  } catch (err) { res.status(500).json({ error: 'خطأ في تسجيل الحضور: ' + err.message }); }
});

router.put('/check-out', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const record = await db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);
    if (!record) return res.status(400).json({ error: 'لم يتم تسجيل الحضور بعد' });
    if (record.check_out) return res.status(400).json({ error: 'تم تسجيل الانصراف مسبقاً' });
    const { lat, lng, address } = req.body;
    await db.prepare('UPDATE attendance SET check_out = NOW(), check_out_lat = ?, check_out_lng = ?, check_out_address = ? WHERE id = ?').run(lat || null, lng || null, address || null, record.id);
    const updated = await db.prepare('SELECT * FROM attendance WHERE id = ?').get(record.id);
    res.json({ message: 'تم تسجيل الانصراف', record: updated });
  } catch (err) { res.status(500).json({ error: 'خطأ في تسجيل الانصراف: ' + err.message }); }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const records = await db.prepare('SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 60').all(req.user.id);
    res.json(records);
  } catch (err) { res.status(500).json({ error: 'خطأ في جلب السجلات' }); }
});

router.get('/admin/all', adminMiddleware, async (req, res) => {
  try {
    const { date_from, date_to, user_id } = req.query;
    let query = 'SELECT a.*, u.name as user_name, u.role as user_role FROM attendance a LEFT JOIN users u ON a.user_id = u.id WHERE 1=1';
    const params = [];
    if (date_from) { query += ' AND a.date >= $' + (params.length + 1); params.push(date_from); }
    if (date_to)   { query += ' AND a.date <= $' + (params.length + 1); params.push(date_to); }
    if (user_id)   { query += ' AND a.user_id = $' + (params.length + 1); params.push(user_id); }
    query += ' ORDER BY a.date DESC, a.check_in DESC LIMIT 500';
    const records = (await db.query(query, params)).rows;
    res.json(records);
  } catch (err) { res.status(500).json({ error: 'خطأ في جلب السجلات' }); }
});

router.get('/admin/today', adminMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const records = await db.prepare(`SELECT a.*, u.name as user_name, u.role as user_role, u.phone as user_phone FROM attendance a LEFT JOIN users u ON a.user_id = u.id WHERE a.date = ? ORDER BY a.check_in ASC`).all(today);
    const totalRow = await db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin' AND status = 'approved'").get();
    const totalEmployees = totalRow.c;
    res.json({ records, total_employees: totalEmployees, present: records.length, absent: totalEmployees - records.length });
  } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

router.delete('/admin/:id', adminMiddleware, async (req, res) => {
  try {
    await db.prepare('DELETE FROM attendance WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم الحذف' });
  } catch (err) { res.status(500).json({ error: 'خطأ في الحذف' }); }
});

module.exports = router;
