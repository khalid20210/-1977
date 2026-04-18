const nodemailer = require('nodemailer');

function readEmailConfig() {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true' || port === 465;
  const config = {
    host: String(process.env.SMTP_HOST || '').trim(),
    port,
    secure,
    user: String(process.env.SMTP_USER || '').trim(),
    pass: String(process.env.SMTP_PASS || '').trim(),
    from: String(process.env.SMTP_FROM || '').trim(),
    senderName: String(process.env.SMTP_SENDER_NAME || 'Jenan BIZ').trim(),
  };

  return config;
}

function ensureEmailConfig() {
  const config = readEmailConfig();
  if (!config.host || !config.user || !config.pass || !config.from) {
    const error = new Error('SMTP_NOT_CONFIGURED');
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }
  return config;
}

function createTransporter() {
  const config = ensureEmailConfig();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

async function sendPasswordResetCodeEmail({ to, code, expiryMinutes = 10 }) {
  const config = ensureEmailConfig();
  const transporter = createTransporter();
  const brandName = config.senderName || 'Jenan BIZ';

  await transporter.sendMail({
    from: `\"${brandName}\" <${config.from}>`,
    to,
    subject: 'رمز استعادة كلمة المرور',
    text: `رمز استعادة كلمة المرور هو: ${code}\nمدة الصلاحية: ${expiryMinutes} دقائق.\nإذا لم تطلب هذا الرمز فتجاهل الرسالة.`,
    html: `
      <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:28px;">
          <div style="font-size:22px;font-weight:700;margin-bottom:10px;">استعادة كلمة المرور</div>
          <div style="font-size:14px;line-height:1.9;color:#475569;">استخدم الرمز التالي لإكمال استعادة كلمة المرور. صلاحية الرمز ${expiryMinutes} دقائق فقط.</div>
          <div style="margin:24px 0;padding:18px;border-radius:16px;background:linear-gradient(90deg,#1e3a8a,#2563eb);color:#ffffff;text-align:center;font-size:34px;font-weight:800;letter-spacing:10px;">${code}</div>
          <div style="font-size:13px;line-height:1.9;color:#64748b;">إذا لم تطلب استعادة كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.</div>
        </div>
      </div>
    `,
  });
}

module.exports = {
  ensureEmailConfig,
  sendPasswordResetCodeEmail,
};
