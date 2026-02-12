
// Script de inicialização do banco de dados Neon atualizado para Gestão de Preços
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Tabelas de Preço (Cabeçalho)
    await sql`
      CREATE TABLE IF NOT EXISTS price_tables (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        type TEXT DEFAULT 'VAREJO',
        active BOOLEAN DEFAULT TRUE
      )
    `;

    // Itens da Tabela de Preço (Vínculo)
    await sql`
      CREATE TABLE IF NOT EXISTS price_table_items (
        id TEXT PRIMARY KEY,
        price_table_id TEXT REFERENCES price_tables(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL,
        product_sku TEXT,
        product_name TEXT,
        price_1 DECIMAL(10,2) DEFAULT 0,
        price_2 DECIMAL(10,2) DEFAULT 0,
        price_3 DECIMAL(10,2) DEFAULT 0,
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Categorias
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        active BOOLEAN DEFAULT TRUE
      )
    `;

    // Tabela de Produtos
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        barcode TEXT,
        category TEXT,
        cost_price DECIMAL(10,2),
        sale_price DECIMAL(10,2),
        stock DECIMAL(10,3),
        image TEXT,
        brand TEXT,
        unit TEXT,
        location TEXT,
        is_service BOOLEAN DEFAULT FALSE,
        min_stock DECIMAL(10,3),
        margin_percent DECIMAL(10,2)
      )
    `;

    // ... (restante das tabelas já existentes se mantém igual no banco)
    
    return res.status(200).json({ success: true, message: 'Database updated with Price Tables' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
