
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Listar Tabelas ou Detalhes
    if (req.method === 'GET') {
      const { id, items } = req.query;
      
      if (items && id) {
        const data = await sql`SELECT * FROM price_table_items WHERE price_table_id = ${id} ORDER BY product_name ASC`;
        return res.status(200).json(data);
      }
      
      const tables = await sql`SELECT * FROM price_tables ORDER BY description ASC`;
      return res.status(200).json(tables);
    }
    
    // Salvar Tabela ou Item
    if (req.method === 'POST') {
      const body = req.body;
      
      if (body.type === 'ITEM') {
        const { id, priceTableId, productId, sku, name, p1, p2, p3 } = body;
        await sql`
          INSERT INTO price_table_items (id, price_table_id, product_id, product_sku, product_name, price_1, price_2, price_3)
          VALUES (${id}, ${priceTableId}, ${productId}, ${sku}, ${name}, ${p1}, ${p2}, ${p3})
          ON CONFLICT (id) DO UPDATE SET 
            price_1 = EXCLUDED.price_1, 
            price_2 = EXCLUDED.price_2, 
            price_3 = EXCLUDED.price_3,
            last_update = CURRENT_TIMESTAMP
        `;
      } else {
        const { id, description, startDate, endDate, tableType, active } = body;
        await sql`
          INSERT INTO price_tables (id, description, start_date, end_date, type, active)
          VALUES (${id}, ${description.toUpperCase()}, ${startDate}, ${endDate}, ${tableType}, ${active})
          ON CONFLICT (id) DO UPDATE SET 
            description = EXCLUDED.description, 
            start_date = EXCLUDED.start_date, 
            end_date = EXCLUDED.end_date, 
            type = EXCLUDED.type, 
            active = EXCLUDED.active
        `;
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
        const { id, type } = req.query;
        if (type === 'ITEM') {
            await sql`DELETE FROM price_table_items WHERE id = ${id}`;
        } else {
            await sql`DELETE FROM price_tables WHERE id = ${id}`;
        }
        return res.status(200).json({ success: true });
    }

  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
