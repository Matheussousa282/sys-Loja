
import { neon } from '@neondatabase/serverless';
export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const data = await sql`SELECT * FROM service_orders ORDER BY date DESC`;
      return res.status(200).json(data.map(os => ({ id: os.id, date: os.date, customerId: os.customer_id, customerName: os.customer_name, description: os.description, status: os.status, items: os.items, totalValue: Number(os.total_value), technicianName: os.technician_name, expectedDate: os.expected_date, store: os.store })));
    }
    if (req.method === 'POST') {
      const os = req.body;
      await sql`INSERT INTO service_orders (id, date, customer_id, customer_name, description, status, items, total_value, technician_name, expected_date, store) VALUES (${os.id}, ${os.date}, ${os.customerId}, ${os.customerName}, ${os.description}, ${os.status}, ${JSON.stringify(os.items)}, ${os.totalValue}, ${os.technicianName || null}, ${os.expectedDate || null}, ${os.store}) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, description=EXCLUDED.description, technician_name=EXCLUDED.technician_name, items=EXCLUDED.items, total_value=EXCLUDED.total_value`;
      return res.status(200).json({ success: true });
    }
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
