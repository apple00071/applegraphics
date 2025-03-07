-- Supabase Schema for Print Press Inventory System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-generate-v4";

-- Drop existing tables if they exist to clean up
DROP TABLE IF EXISTS inventory_transactions;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'user',
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Materials table with proper relations
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category_id INTEGER REFERENCES categories(id),
  supplier_id INTEGER REFERENCES suppliers(id),
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
  id SERIAL PRIMARY KEY,
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
  id SERIAL PRIMARY KEY,
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
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id),
  quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory_transactions table to track stock movements
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  material_id INTEGER REFERENCES materials(id),
  transaction_type TEXT NOT NULL, -- 'purchase', 'sale', 'adjustment', etc.
  quantity INTEGER NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  unit_price DECIMAL(10, 2),
  order_id INTEGER REFERENCES orders(id),
  notes TEXT,
  user_id INTEGER REFERENCES users(id),
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to update material stock
CREATE OR REPLACE FUNCTION update_material_stock(
  material_id_param INTEGER, 
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

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password, role, full_name)
VALUES
  ('admin', 'admin@printpress.com', '$2b$10$hJElUNFGTOJQRR9K.OolMuJNsQ7KY19COMdmONJoFME/fLhXXvtTO', 'admin', 'System Administrator')
ON CONFLICT (username) DO NOTHING;

-- Enable Row-Level Security (RLS) for all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Allow full access to authenticated users" ON users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create RLS policy for anon access (for public data only)
CREATE POLICY "Allow reading public data" ON categories
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow reading public data" ON suppliers
  FOR SELECT TO anon USING (true); 