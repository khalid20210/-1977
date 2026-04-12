const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const campaignUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../uploads/campaigns');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase().slice(1))) return cb(null, true);
    cb(new Error('نوع الملف غير مدعوم'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const campaigns = await db.prepare('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(campaigns);
  } catch (err) { res.status(500).json({ error: 'خطأ في استرجاع الحملات' }); }
});

router.post('/', authMiddleware, campaignUpload.single('image'), async (req, res) => {
  try {
    const { title, message } = req.body;
    const imagePath = req.file ? req.file.filename : null;
    const result = await db.prepare('INSERT INTO campaigns (user_id, title, message, image_path) VALUES (?, ?, ?, ?)').run(req.user.id, title, message, imagePath);
    res.json({ id: result.lastInsertRowid, message: 'تم إنشاء الحملة بنجاح' });
  } catch (err) { res.status(500).json({ error: 'خطأ في إنشاء الحملة' }); }
});

router.post('/:id/send', authMiddleware, async (req, res) => {
  try {
    const campaign = await db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!campaign) return res.status(404).json({ error: 'الحملة غير موجودة' });
    const clients = await db.prepare("SELECT DISTINCT owner_phone FROM requests WHERE user_id = ? AND owner_phone IS NOT NULL AND owner_phone != ''").all(req.user.id);
    await db.prepare("UPDATE campaigns SET status = 'sent', sent_at = NOW() WHERE id = ?").run(req.params.id);
    res.json({ message: `تم إرسال الحملة إلى ${clients.length} عميل` });
  } catch (err) { res.status(500).json({ error: 'خطأ في إرسال الحملة' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const campaign = await db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!campaign) return res.status(404).json({ error: 'الحملة غير موجودة' });
    if (campaign.image_path) {
      const imgPath = path.join(__dirname, '../uploads/campaigns', campaign.image_path);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    await db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم حذف الحملة' });
  } catch (err) { res.status(500).json({ error: 'خطأ في حذف الحملة' }); }
});

module.exports = router;
