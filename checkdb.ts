import { db } from './server/db';
import { sql } from 'drizzle-orm';
async function main() {
  const r = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name='loads' ORDER BY ordinal_position`);
  console.log('DB columns:', r.rows.map((x:any)=>x.column_name).join(', '));
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
