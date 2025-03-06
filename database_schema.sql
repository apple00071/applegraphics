-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Materials categories
CREATE TABLE material_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT
);

-- Materials table
CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES material_categories(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sku VARCHAR(50) UNIQUE,
  unit_of_measure VARCHAR(20) NOT NULL,
  reorder_level INTEGER NOT NULL,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2),
  supplier_id INTEGER REFERENCES suppliers(id),
  location VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Paper-specific properties
CREATE TABLE paper_materials (
  material_id INTEGER PRIMARY KEY REFERENCES materials(id),
  paper_type VARCHAR(50),
  size VARCHAR(50),
  weight DECIMAL(10,2),
  color VARCHAR(50),
  finish VARCHAR(50)
);

-- Ink-specific properties
CREATE TABLE ink_materials (
  material_id INTEGER PRIMARY KEY REFERENCES materials(id),
  color VARCHAR(50),
  type VARCHAR(50),
  compatible_surfaces TEXT
);

-- Equipment table
CREATE TABLE equipment (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  serial_number VARCHAR(100),
  purchase_date DATE,
  purchase_cost DECIMAL(10,2),
  supplier_id INTEGER REFERENCES suppliers(id),
  maintenance_interval INTEGER,
  last_maintenance_date DATE,
  status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  required_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  notes TEXT
);

-- Production jobs
CREATE TABLE production_jobs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  job_name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE,
  due_date DATE,
  completion_date DATE,
  status VARCHAR(50) DEFAULT 'scheduled',
  assigned_to INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job materials
CREATE TABLE job_materials (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES production_jobs(id),
  material_id INTEGER REFERENCES materials(id),
  quantity_required DECIMAL(10,2) NOT NULL,
  quantity_used DECIMAL(10,2) DEFAULT 0
);

-- Inventory transactions
CREATE TABLE inventory_transactions (
  id SERIAL PRIMARY KEY,
  material_id INTEGER REFERENCES materials(id),
  transaction_type VARCHAR(50) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unit_price DECIMAL(10,2),
  job_id INTEGER REFERENCES production_jobs(id),
  user_id INTEGER REFERENCES users(id),
  notes TEXT
); 