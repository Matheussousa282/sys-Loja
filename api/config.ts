
import { neon } from '@neondatabase/serverless';
export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const data = await sql`SELECT * FROM system_configs WHERE id = 'main'`;
      return res.status(200).json(data[0] || { companyName: 'ERP Retail', returnPeriodDays: 30 });
    }
    if (req.method === 'POST') {
      const c = req.body;
      await sql`INSERT INTO system_configs (id, company_name, logo_url, return_period_days) VALUES ('main', ${c.companyName}, ${c.logoUrl}, ${c.returnPeriodDays}) ON CONFLICT (id) DO UPDATE SET company_name=EXCLUDED.company_name, logo_url=EXCLUDED.logo_url, return_period_days=EXCLUDED.return_period_days`;
      return res.status(200).json({ success: true });
    }
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
