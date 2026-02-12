
import { neon } from '@neondatabase/serverless';
export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const data = await sql`SELECT * FROM consignment_sales ORDER BY date DESC`;
      return res.status(200).json(data.map(s => ({
        id: s.id, customerId: s.customer_id, customerName: s.customer_name, vendorId: s.vendor_id, date: s.date,
        grossValue: Number(s.gross_value || 0), discount: Number(s.discount || 0), netValue: Number(s.net_value || 0),
        paidValue: Number(s.paid_value || 0), balance: Number(s.balance || 0), status: s.status, observation: s.observation,
        items: s.items || [], store: s.store
      })));
    }
    if (req.method === 'POST') {
      const body = req.body;
      if (body.type === 'RETURN') {
        await sql`INSERT INTO consignment_returns (id, consignment_id, product_id, product_name, quantity, value, date, reason) VALUES (${body.id || `RET-${Date.now()}`}, ${body.consignmentId}, ${body.productId}, ${body.productName}, ${body.quantity}, ${body.value}, ${body.date}, ${body.reason})`;
      } else {
        await sql`
          INSERT INTO consignment_sales (id, customer_id, customer_name, vendor_id, date, gross_value, discount, net_value, paid_value, balance, status, observation, items, store)
          VALUES (${body.id}, ${body.customerId}, ${body.customerName}, ${body.vendorId}, ${body.date}, ${body.grossValue}, ${body.discount}, ${body.netValue}, ${body.paidValue}, ${body.balance}, ${body.status}, ${body.observation}, ${JSON.stringify(body.items)}, ${body.store})
          ON CONFLICT (id) DO UPDATE SET paid_value=EXCLUDED.paid_value, balance=EXCLUDED.balance, status=EXCLUDED.status, items=EXCLUDED.items, observation=EXCLUDED.observation
        `;
      }
      return res.status(200).json({ success: true });
    }
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
