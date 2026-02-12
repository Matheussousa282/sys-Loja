
import { neon } from '@neondatabase/serverless';
export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') return res.status(200).json(await sql`SELECT * FROM card_operators ORDER BY name ASC`);
    if (req.method === 'POST') {
      const o = req.body;
      await sql`INSERT INTO card_operators (id, name, active) VALUES (${o.id}, ${o.name}, ${o.active}) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, active=EXCLUDED.active`;
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') { await sql`DELETE FROM card_operators WHERE id = ${req.query.id}`; return res.status(200).json({ success: true }); }
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
