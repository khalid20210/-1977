const express = require('express');
const db = require('../database');
const { adminMiddleware } = require('../middleware/authMiddleware');
const { testConnection } = require('../services/aiService');

const router = express.Router();

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const rows = await db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    rows.forEach(r => { result[r.key] = r.key === 'ai_api_key' && r.value ? '••••••••' : r.value; });
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'خطأ في استرجاع الإعدادات' }); }
});

router.put('/', adminMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'ai_api_key' && value === '••••••••') continue;
      if (value === undefined || value === null) continue;
      await db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()").run(key, String(value));
    }
    res.json({ message: 'تم حفظ الإعدادات بنجاح' });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'خطأ في حفظ الإعدادات: ' + err.message });
  }
});

router.get('/ai-models', adminMiddleware, (req, res) => {
  res.json({
    models: [
      { id: 'gpt-4o', name: 'GPT-4o — الأدق والأفضل (موصى به)', provider: 'openai' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini — أسرع وأقل تكلفة', provider: 'openai' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
    ],
    recommended: 'gpt-4o',
    note: 'GPT-4o هو الأدق عالمياً في تحليل المستندات والكشوفات البنكية.'
  });
});

router.post('/test-ai', adminMiddleware, async (req, res) => {
  try {
    const keyRow = await db.prepare("SELECT value FROM settings WHERE key = 'ai_api_key'").get();
    const apiKey = keyRow?.value;
    if (!apiKey) return res.status(400).json({ error: 'لم يتم إدخال مفتاح الذكاء الاصطناعي بعد' });
    const result = await testConnection(apiKey);
    res.json({ message: 'الاتصال بالذكاء الاصطناعي ناجح ✅', response: result });
  } catch (err) { res.status(400).json({ error: `فشل الاتصال: ${err.message}` }); }
});

router.get('/public', async (req, res) => {
  try {
    const name = await db.prepare("SELECT value FROM settings WHERE key = 'platform_name'").get();
    res.json({ platform_name: name?.value || 'منصة جنان بيز حلول الأعمال' });
  } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

module.exports = router;
