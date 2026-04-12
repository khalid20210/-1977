require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const p = new Pool({ ssl: { rejectUnauthorized: false } });

async function main() {
  console.log('📦 تصدير البيانات القديمة...');

  const backup = {};
  const tables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");

  for (const { table_name } of tables.rows) {
    try {
      const r = await p.query(`SELECT * FROM "${table_name}" LIMIT 1000`);
      if (r.rows.length > 0) {
        backup[table_name] = r.rows;
        console.log(`  ✅ ${table_name}: ${r.rows.length} صف`);
      }
    } catch (e) {
      console.log(`  ⚠️ ${table_name}: تعذّر التصدير`);
    }
  }

  fs.writeFileSync('old-data-backup.json', JSON.stringify(backup, null, 2), 'utf8');
  console.log('\n✅ تم الحفظ في: old-data-backup.json');

  // Now drop all tables
  console.log('\n🗑️ حذف الجداول القديمة...');
  await p.query('DROP SCHEMA public CASCADE');
  await p.query('CREATE SCHEMA public');
  await p.query('GRANT ALL ON SCHEMA public TO postgres');
  await p.query('GRANT ALL ON SCHEMA public TO public');
  console.log('✅ تم حذف وإعادة إنشاء الـ schema');

  await p.end();
}

main().catch(e => { console.error('Error:', e.message); p.end(); process.exit(1); });
