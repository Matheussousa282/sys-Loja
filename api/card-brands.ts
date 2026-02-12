
import { neon } from '@neondatabase/serverless';
export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const data = await sql`SELECT * FROM card_brands ORDER BY name ASC`;
      return res.status(200).json(data.map(b => ({ id: b.id, name: b.name, operatorId: b.operator_id, active: b.active })));
    }
    if (req.method === 'POST') {
      const b = req.body;
      await sql`INSERT INTO card_brands (id, name, operator_id, active) VALUES (${b.id}, ${b.name}, ${b.operatorId}, ${b.active}) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, operator_id=EXCLUDED.operator_id, active=EXCLUDED.active`;
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') { await sql`DELETE FROM card_brands WHERE id = ${req.query.id}`; return res.status(200).json({ success: true }); }
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
