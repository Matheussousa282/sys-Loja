
import { neon } from '@neondatabase/serverless';
export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const data = await sql`SELECT * FROM products ORDER BY name ASC`;
      const mapped = data.map(p => ({
        id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, category: p.category,
        costPrice: Number(p.cost_price || 0), salePrice: Number(p.sale_price || 0), stock: Number(p.stock || 0),
        image: p.image, brand: p.brand, unit: p.unit, location: p.location, isService: !!p.is_service,
        minStock: Number(p.min_stock || 0), marginPercent: Number(p.margin_percent || 0)
      }));
      return res.status(200).json(mapped);
    }
    if (req.method === 'POST') {
      const p = req.body;
      await sql`
        INSERT INTO products (id, name, sku, barcode, category, cost_price, sale_price, stock, image, brand, unit, location, is_service, min_stock, margin_percent)
        VALUES (${p.id}, ${p.name.toUpperCase()}, ${p.sku.toUpperCase()}, ${p.barcode || ''}, ${p.category}, ${p.costPrice}, ${p.salePrice}, ${p.stock}, ${p.image}, ${p.brand || ''}, ${p.unit || 'UN'}, ${p.location || 'GERAL'}, ${!!p.isService}, ${p.minStock || 0}, ${p.marginPercent || 0})
        ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, sku=EXCLUDED.sku, barcode=EXCLUDED.barcode, category=EXCLUDED.category, cost_price=EXCLUDED.cost_price, sale_price=EXCLUDED.sale_price, stock=EXCLUDED.stock, image=EXCLUDED.image, brand=EXCLUDED.brand, unit=EXCLUDED.unit, location=EXCLUDED.location, is_service=EXCLUDED.is_service, min_stock=EXCLUDED.min_stock, margin_percent=EXCLUDED.margin_percent
      `;
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      await sql`DELETE FROM products WHERE id = ${req.query.id}`;
      return res.status(200).json({ success: true });
    }
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}
