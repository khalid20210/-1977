const db = require('../database');

async function createNotification(userId, payload = {}) {
  const { type = 'general', title, body = null, link = null } = payload;
  if (!userId || !title || !String(title).trim()) return null;

  return db.prepare(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)`
  ).run(userId, type, String(title).trim(), body || null, link || null);
}

async function notifyAdmins(payload = {}, options = {}) {
  const { excludeUserId = null } = options;
  const admins = await db.prepare(
    `SELECT id FROM users WHERE role = 'admin' AND status = 'approved'`
  ).all();

  for (const admin of admins) {
    if (excludeUserId && Number(admin.id) === Number(excludeUserId)) continue;
    await createNotification(admin.id, payload);
  }
}

module.exports = {
  createNotification,
  notifyAdmins,
};