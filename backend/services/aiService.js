const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const db = require('../database');

function getAIConfig() {
  const rows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?)').all('ai_provider', 'ai_model', 'ai_api_key');
  const config = {};
  rows.forEach(r => (config[r.key] = r.value));
  return {
    provider: config.ai_provider || 'openai',
    model: config.ai_model || 'gpt-4o',
    apiKey: config.ai_api_key || process.env.OPENAI_API_KEY || ''
  };
}

function fileToBase64(filePath) {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
}

function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' };
  return map[ext] || 'application/octet-stream';
}

async function extractPdfText(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  } catch (e) {
    return null;
  }
}

async function analyzeBankStatement(filePath, fileName) {
  const config = getAIConfig();
  if (!config.apiKey) {
    throw new Error('لم يتم إعداد مفتاح الذكاء الاصطناعي. يرجى الإعداد من لوحة الأدمن > الإعدادات.');
  }

  const openai = new OpenAI({ apiKey: config.apiKey });
  const ext = path.extname(fileName).toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

  const systemPrompt = `أنت محاسب قانوني خبير متخصص في تحليل كشوفات الحسابات البنكية السعودية.
مهمتك استخراج البيانات المالية بدقة تامة لا تقبل الخطأ مطلقاً.

استخرج من الكشف البنكي:
1. إجمالي نقاط البيع (POS) الدائن - جميع عمليات البيع عبر نقاط البيع
2. إجمالي الإيداعات الدائن - الإيداعات النقدية فقط
3. إجمالي التحويلات الواردة الدائن - جميع التحويلات الواردة
4. فترة الكشف والبنك

أعد النتيجة بصيغة JSON فقط بدون أي نص خارج JSON:
{
  "total_pos": 0,
  "total_deposit": 0,
  "total_transfer": 0,
  "period_label": "يناير 2024",
  "period_start": "01/2024",
  "period_end": "01/2024",
  "bank_name": "اسم البنك",
  "notes": ""
}`;

  let messages;

  if (isImage) {
    const base64 = fileToBase64(filePath);
    const mimeType = getMimeType(fileName);
    messages = [{
      role: 'user',
      content: [
        { type: 'text', text: systemPrompt + '\n\nقم بتحليل كشف الحساب البنكي في الصورة:' },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } }
      ]
    }];
  } else if (ext === '.pdf') {
    const pdfText = await extractPdfText(filePath);
    if (pdfText && pdfText.trim().length > 100) {
      messages = [{ role: 'user', content: `${systemPrompt}\n\nنص كشف الحساب البنكي:\n${pdfText}` }];
    } else {
      // Scanned PDF - convert first page to base64
      const base64 = fileToBase64(filePath);
      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: systemPrompt + '\n\nقم بتحليل كشف الحساب البنكي (PDF):' },
          { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}`, detail: 'high' } }
        ]
      }];
    }
  } else {
    throw new Error('نوع الملف غير مدعوم. المسموح: PDF, JPG, PNG, WEBP');
  }

  const response = await openai.chat.completions.create({
    model: config.model,
    messages,
    temperature: 0,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content);
  return {
    total_pos: Number(result.total_pos) || 0,
    total_deposit: Number(result.total_deposit) || 0,
    total_transfer: Number(result.total_transfer) || 0,
    period_label: result.period_label || '',
    period_start: result.period_start || '',
    period_end: result.period_end || '',
    bank_name: result.bank_name || '',
    notes: result.notes || ''
  };
}

async function analyzeDocument(filePath, fileName) {
  const config = getAIConfig();
  if (!config.apiKey) {
    throw new Error('لم يتم إعداد مفتاح الذكاء الاصطناعي.');
  }

  const openai = new OpenAI({ apiKey: config.apiKey });
  const ext = path.extname(fileName).toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayISO = new Date().toISOString().split('T')[0];

  const prompt = `أنت خبير في التحقق من مستندات وسجلات الشركات السعودية.
تاريخ اليوم: ${today} (${todayISO})

حلل هذا المستند واستخرج:
1. نوع المستند
2. تاريخ انتهاء الصلاحية (إن وجد)
3. هل المستند سارٍ أم منتهي؟

أعد النتيجة بصيغة JSON فقط:
{
  "document_type": "نوع المستند",
  "expiry_date": "DD/MM/YYYY أو null إذا لم يوجد تاريخ انتهاء",
  "is_expired": false,
  "is_valid": true,
  "notes": "ملاحظات إضافية"
}`;

  let messages;
  if (isImage) {
    const base64 = fileToBase64(filePath);
    const mimeType = getMimeType(fileName);
    messages = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } }
      ]
    }];
  } else {
    const pdfText = await extractPdfText(filePath);
    messages = [{ role: 'user', content: `${prompt}\n\nنص المستند:\n${pdfText || 'لم يمكن استخراج النص'}` }];
  }

  const response = await openai.chat.completions.create({
    model: config.model,
    messages,
    temperature: 0,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content);
  return {
    document_type: result.document_type || '',
    expiry_date: result.expiry_date || null,
    is_expired: Boolean(result.is_expired),
    is_valid: Boolean(result.is_valid),
    notes: result.notes || ''
  };
}

async function testConnection(apiKey) {
  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'قل "الاتصال ناجح" فقط.' }],
    max_tokens: 20
  });
  return response.choices[0].message.content;
}

module.exports = { analyzeBankStatement, analyzeDocument, testConnection };
