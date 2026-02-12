
import { neon } from '@neondatabase/serverless';
export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const data = await sql`SELECT * FROM cash_sessions ORDER BY id DESC LIMIT 50`;
      const mapped = data.map(s => ({
        id: s.id, storeId: s.store_id, storeName: s.store_name, registerName: s.register_name, openingTime: s.opening_time,
        openingOperatorId: s.opening_operator_id, openingOperatorName: s.opening_operator_name, openingValue: Number(s.opening_value || 0),
        closingTime: s.closing_time, closingOperatorId: s.closing_operator_id, closingOperatorName: s.closing_operator_name,
        closingValue: Number(s.closing_value || 0), status: s.status, priceTable: s.price_table
      }));
      return res.status(200).json(mapped);
    }
    if (req.method === 'POST') {
      const s = req.body;
      await sql`
        INSERT INTO cash_sessions (id, store_id, store_name, register_name, opening_time, opening_operator_id, opening_operator_name, opening_value, closing_time, closing_operator_id, closing_operator_name, closing_value, status, price_table)
        VALUES (${s.id}, ${s.storeId}, ${s.storeName}, ${s.registerName}, ${s.openingTime}, ${s.openingOperatorId}, ${s.openingOperatorName}, ${s.openingValue}, ${s.closingTime || null}, ${s.closingOperatorId || null}, ${s.closingOperatorName || null}, ${s.closingValue || 0}, ${s.status}, ${s.priceTable})
        ON CONFLICT (id) DO UPDATE SET closing_time=EXCLUDED.closing_time, closing_operator_id=EXCLUDED.closing_operator_id, closing_operator_name=EXCLUDED.closing_operator_name, closing_value=EXCLUDED.closing_value, status=EXCLUDED.status
      `;
      return res.status(200).json({ success: true });
    }
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
