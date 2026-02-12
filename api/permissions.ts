
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      const data = await sql`SELECT role, permissions FROM role_permissions`;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { role, permissions } = req.body;
      if (!role) return res.status(400).json({ error: 'Role is required' });
      
      await sql`
        INSERT INTO role_permissions (role, permissions)
        VALUES (${role}, ${JSON.stringify(permissions)})
        ON CONFLICT (role) DO UPDATE SET
          permissions = EXCLUDED.permissions
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error("API Permissions Error:", e);
    return res.status(500).json({ error: e.message });
  }
}
