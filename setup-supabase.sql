-- Create tables for PrintPress Inventory Management System

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material categories
CREATE TABLE IF NOT EXISTS public.material_categories (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    notes TEXT
);

-- Materials
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    category_id UUID REFERENCES public.material_categories(id),
    supplier_id UUID REFERENCES public.suppliers(id),
    unit_of_measure VARCHAR(50),
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reorder_level DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(10, 2),
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    serial_number VARCHAR(255),
    purchase_date DATE,
    warranty_expiry DATE,
    status VARCHAR(50) DEFAULT 'operational',
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes TEXT
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    notes TEXT
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE,
    customer_id UUID REFERENCES public.customers(id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    required_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production jobs
CREATE TABLE IF NOT EXISTS public.production_jobs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id),
    job_name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    start_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES public.users(id),
    notes TEXT
);

-- Inventory transactions
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    material_id UUID REFERENCES public.materials(id),
    transaction_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    job_id UUID REFERENCES public.production_jobs(id),
    user_id UUID REFERENCES public.users(id),
    notes TEXT
);

-- Job materials
CREATE TABLE IF NOT EXISTS public.job_materials (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    job_id UUID REFERENCES public.production_jobs(id),
    material_id UUID REFERENCES public.materials(id),
    quantity_required DECIMAL(10, 2) NOT NULL,
    quantity_used DECIMAL(10, 2) DEFAULT 0
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update material stock
CREATE OR REPLACE FUNCTION update_material_stock(material_id UUID, quantity_change DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE public.materials
    SET 
        current_stock = current_stock + quantity_change,
        updated_at = NOW()
    WHERE id = material_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default admin user (password: admin123)
INSERT INTO public.users (username, password, email, role, full_name)
VALUES 
    ('admin', '$2b$10$hJElUNFGTOJQRR9K.OolMuJNsQ7KY19COMdmONJoFME/fLhXXvtTO', 'admin@printpress.com', 'admin', 'System Administrator'),
    ('user', '$2b$10$P4V3nDmuJyQqKPnAts.5TO/TzPdaNwPI2AWYc.5q6XrjQJ1YPLOtu', 'user@printpress.com', 'user', 'Regular User')
ON CONFLICT (username) DO NOTHING;

-- Insert sample material categories
INSERT INTO public.material_categories (name, description)
VALUES 
    ('Paper', 'All types of printing paper'),
    ('Ink', 'Printing inks'),
    ('Binding Materials', 'Materials used for binding'),
    ('Plates', 'Printing plates'),
    ('Chemicals', 'Chemicals used in printing process')
ON CONFLICT (name) DO NOTHING;

-- This script sets up the necessary tables in your Supabase project
-- Execute these SQL statements in the Supabase SQL Editor

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create materials table with proper relations
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

-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  status TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
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

-- Create order_items table to link orders with materials
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id),
  quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory_transactions table to track stock movements
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  material_id INTEGER REFERENCES materials(id),
  transaction_type TEXT NOT NULL, -- 'purchase', 'sale', 'adjustment', etc.
  quantity INTEGER NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  unit_price DECIMAL(10, 2),
  order_id INTEGER REFERENCES orders(id),
  notes TEXT,
  user_id TEXT,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert some initial categories
INSERT INTO categories (name, description)
VALUES
  ('Paper', 'Various types of printing paper'),
  ('Ink', 'Printing inks of different colors'),
  ('Binding', 'Materials for binding books and documents'),
  ('Plates', 'Printing plates and related materials')
ON CONFLICT DO NOTHING;

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
-- You may want to restrict these policies further in a production environment
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