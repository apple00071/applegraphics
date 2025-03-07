-- Supabase Schema for Print Press Inventory System with UUID primary keys
-- This matches what appears to be already in your database

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-generate-v4";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Materials table with proper relations
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category_id UUID REFERENCES categories(id),
  supplier_id UUID REFERENCES suppliers(id),
  current_stock INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  unit_price DECIMAL(10, 2) DEFAULT 0,
  unit_of_measure TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  status TEXT DEFAULT 'operational',
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  required_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  total_amount DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order_items table to link orders with materials
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory_transactions table to track stock movements
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES materials(id),
  transaction_type TEXT NOT NULL, -- 'purchase', 'sale', 'adjustment', etc.
  quantity INTEGER NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  unit_price DECIMAL(10, 2),
  order_id UUID REFERENCES orders(id),
  notes TEXT,
  user_id TEXT,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to update material stock
CREATE OR REPLACE FUNCTION update_material_stock(
  material_id_param UUID, 
  quantity_change INTEGER
) 
RETURNS VOID AS $$
BEGIN
  UPDATE materials
  SET 
    current_stock = current_stock + quantity_change,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = material_id_param;
END;
$$ LANGUAGE plpgsql;

-- Insert some initial categories
INSERT INTO categories (name, description)
VALUES
  ('Paper', 'Various types of printing paper'),
  ('Ink', 'Printing inks of different colors'),
  ('Binding', 'Materials for binding books and documents'),
  ('Plates', 'Printing plates and related materials')
ON CONFLICT (name) DO NOTHING;

-- Insert some initial suppliers
INSERT INTO suppliers (name, contact_person, email, phone)
VALUES
  ('Paper Supply Co.', 'John Smith', 'john@papersupply.com', '555-1234'),
  ('Premium Inks Ltd.', 'Sarah Johnson', 'sarah@premiuminks.com', '555-5678'),
  ('Binding Specialists', 'Mike Brown', 'mike@bindingspecialists.com', '555-9012')
ON CONFLICT DO NOTHING;

-- Enable Row-Level Security (RLS) for all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all authenticated users to perform all operations
CREATE POLICY "Allow full access to authenticated users" ON categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users" ON suppliers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users" ON materials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users" ON equipment
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users" ON orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users" ON order_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users" ON inventory_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create RLS policy for anon access (for public data only)
CREATE POLICY "Allow reading public data" ON categories
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow reading public data" ON suppliers
  FOR SELECT TO anon USING (true); 