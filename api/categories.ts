
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      const data = await sql`SELECT * FROM categories ORDER BY name ASC`;
      return res.status(200).json(data);
    }
    
    if (req.method === 'POST') {
      const { id, name, description, active } = req.body;
      await sql`
        INSERT INTO categories (id, name, description, active)
        VALUES (${id}, ${name.toUpperCase()}, ${description || ''}, ${active !== undefined ? active : true})
        ON CONFLICT (id) DO UPDATE SET 
          name = EXCLUDED.name, 
          description = EXCLUDED.description, 
          active = EXCLUDED.active
      `;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM categories WHERE id = ${req.query.id}`;
      return res.status(200).json({ success: true });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
