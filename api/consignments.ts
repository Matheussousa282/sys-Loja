
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL não configurada' });
  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'GET') {
    try {
      const data = await sql`SELECT * FROM consignment_sales ORDER BY date DESC`;
      const mapped = data.map(s => ({
        id: s.id,
        customerId: s.customer_id,
        customerName: s.customer_name,
        vendorId: s.vendor_id,
        date: s.date,
        grossValue: Number(s.gross_value || 0),
        discount: Number(s.discount || 0),
        netValue: Number(s.net_value || 0),
        paidValue: Number(s.paid_value || 0),
        balance: Number(s.balance || 0),
        status: s.status,
        observation: s.observation,
        items: s.items || [],
        store: s.store
      }));
      return res.status(200).json(mapped);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      if (body.type === 'RETURN') {
        const retId = body.id || `RET-${Date.now()}`;
        await sql`
          INSERT INTO consignment_returns (id, consignment_id, product_id, product_name, quantity, value, date, reason)
          VALUES (${retId}, ${body.consignmentId}, ${body.productId}, ${body.productName}, ${body.quantity}, ${body.value}, ${body.date}, ${body.reason})
        `;
        return res.status(200).json({ success: true, id: retId });
      } else {
        await sql`
          INSERT INTO consignment_sales (
            id, customer_id, customer_name, vendor_id, date, gross_value, discount, net_value, paid_value, balance, status, observation, items, store
          )
          VALUES (
            ${body.id}, ${body.customerId}, ${body.customerName}, ${body.vendorId || null}, ${body.date}, ${body.grossValue}, ${body.discount}, 
            ${body.netValue}, ${body.paidValue}, ${body.balance}, ${body.status}, ${body.observation}, ${JSON.stringify(body.items)}, ${body.store}
          )
          ON CONFLICT (id) DO UPDATE SET
            paid_value = EXCLUDED.paid_value,
            balance = EXCLUDED.balance,
            status = EXCLUDED.status,
            observation = EXCLUDED.observation,
            items = EXCLUDED.items,
            vendor_id = EXCLUDED.vendor_id
        `;
        return res.status(200).json({ success: true, id: body.id });
      }
    } catch (e: any) {
      console.error("API POST Consignments Error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
