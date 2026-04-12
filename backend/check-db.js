require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ ssl: { rejectUnauthorized: false } });

async function main() {
  const tables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('=== Tables ===');
  console.log(tables.rows.map(x => x.table_name).join(', '));

  // Check users table column types
  const cols = await p.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position");
  console.log('\n=== Users columns ===');
  cols.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (${c.udt_name})`));

  await p.end();
}
main().catch(e => { console.error(e.message); p.end(); });
