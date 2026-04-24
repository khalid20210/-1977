const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const brokers = await db.prepare(`SELECT b.*, u.name as added_by_name FROM brokers b LEFT JOIN users u ON b.added_by_id = u.id ORDER BY b.created_at DESC`).all();
    res.json(brokers);
  } catch (err) { res.status(500).json({ error: 'خطأ في استرجاع الوسطاء' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, phone, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'اسم الوسيط مطلوب' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'رقم الجوال مطلوب' });
    const result = await db.prepare('INSERT INTO brokers (name, phone, added_by_id, notes) VALUES (?, ?, ?, ?)').run(name.trim(), phone.trim(), req.user.id, notes?.trim() || null);
    const broker = await db.prepare('SELECT b.*, u.name as added_by_name FROM brokers b LEFT JOIN users u ON b.added_by_id = u.id WHERE b.id = ?').get(result.lastInsertRowid);
    res.status(201).json(broker);
  } catch (err) { res.status(500).json({ error: 'خطأ في إضافة الوسيط' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const broker = await db.prepare('SELECT * FROM brokers WHERE id = ?').get(req.params.id);
    if (!broker) return res.status(404).json({ error: 'الوسيط غير موجود' });
    if (req.user.role !== 'admin' && broker.added_by_id !== req.user.id) return res.status(403).json({ error: 'غير مصرح' });
    const { name, phone, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'اسم الوسيط مطلوب' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'رقم الجوال مطلوب' });
    await db.prepare('UPDATE brokers SET name = ?, phone = ?, notes = ? WHERE id = ?').run(name.trim(), phone.trim(), notes?.trim() || null, req.params.id);
    const updated = await db.prepare('SELECT b.*, u.name as added_by_name FROM brokers b LEFT JOIN users u ON b.added_by_id = u.id WHERE b.id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'خطأ في التعديل' }); }
});

router.post('/bulk-delete', authMiddleware, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (ids.length === 0) return res.status(400).json({ error: 'لم يتم تحديد وسطاء للحذف' });

    let deletedCount = 0;

    for (const id of ids) {
      const broker = await db.prepare('SELECT * FROM brokers WHERE id = ?').get(id);
      if (!broker) continue;
      if (req.user.role !== 'admin' && broker.added_by_id !== req.user.id) continue;
      await db.prepare('DELETE FROM brokers WHERE id = ?').run(id);
      deletedCount += 1;
    }

    res.json({ message: `تم حذف ${deletedCount} وسيط`, deletedCount });
  } catch (err) { res.status(500).json({ error: 'خطأ في الحذف الجماعي' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const broker = await db.prepare('SELECT * FROM brokers WHERE id = ?').get(req.params.id);
    if (!broker) return res.status(404).json({ error: 'الوسيط غير موجود' });
    if (req.user.role !== 'admin' && broker.added_by_id !== req.user.id) return res.status(403).json({ error: 'غير مصرح' });
    await db.prepare('DELETE FROM brokers WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم حذف الوسيط' });
  } catch (err) { res.status(500).json({ error: 'خطأ في الحذف' }); }
});

module.exports = router;
