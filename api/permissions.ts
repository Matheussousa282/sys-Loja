
import { neon } from '@neondatabase/serverless';
export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') return res.status(200).json(await sql`SELECT role, permissions FROM role_permissions`);
    if (req.method === 'POST') {
      await sql`INSERT INTO role_permissions (role, permissions) VALUES (${req.body.role}, ${JSON.stringify(req.body.permissions)}) ON CONFLICT (role) DO UPDATE SET permissions=EXCLUDED.permissions`;
      return res.status(200).json({ success: true });
    }
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
