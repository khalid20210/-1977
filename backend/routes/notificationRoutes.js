const express = require('express');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/notifications - get user notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rows = await db.prepare(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    ).all(req.user.id);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'خطأ في استرجاع التنبيهات' }); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const row = await db.prepare(
      `SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = FALSE`
    ).get(req.user.id);
    res.json({ count: Number(row?.c) || 0 });
  } catch (err) { res.status(500).json({ count: 0 }); }
});

// PATCH /api/notifications/read-all - يجب قبل /:id
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await db.prepare(`UPDATE notifications SET is_read = TRUE WHERE user_id = ?`).run(req.user.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    await db.prepare(
      `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`
    ).run(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// DELETE /api/notifications/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.prepare(`DELETE FROM notifications WHERE id = ? AND user_id = ?`).run(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'خطأ في الحذف' }); }
});

// POST /api/notifications - admin يرسل تنبيه لمستخدم أو للجميع
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { user_id, title, body, link, type, target } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'العنوان مطلوب' });

    if (target === 'all') {
      const users = await db.prepare(
        `SELECT id FROM users WHERE status = 'approved' AND role != 'admin'`
      ).all();
      for (const u of users) {
        await db.prepare(
          `INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)`
        ).run(u.id, type || 'general', title.trim(), body || null, link || null);
      }
      return res.status(201).json({ ok: true, count: users.length });
    }

    if (!user_id) return res.status(400).json({ error: 'يجب تحديد المستخدم أو اختيار الكل' });
    await db.prepare(
      `INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)`
    ).run(Number(user_id), type || 'general', title.trim(), body || null, link || null);
    res.status(201).json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'خطأ في إرسال التنبيه' }); }
});

// Helper: create notification internally (used by other routes)
router.createNotification = async (userId, type, title, body, link) => {
  try {
    await db.prepare(
      `INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)`
    ).run(userId, type, title, body || null, link || null);
  } catch (_) {}
};

module.exports = router;
