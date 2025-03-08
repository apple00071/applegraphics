-- Schema Fix for PrintPress Inventory System
-- Run this script in your Supabase SQL Editor to fix schema cache issues

-- Step 1: Create a helper function to check if a function exists
CREATE OR REPLACE FUNCTION function_exists(function_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = function_name
  ) INTO func_exists;
  
  RETURN func_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create a function to insert orders bypassing schema cache
CREATE OR REPLACE FUNCTION insert_order(
  p_customer_name TEXT,
  p_order_date TIMESTAMPTZ,
  p_required_date TIMESTAMPTZ,
  p_status TEXT,
  p_notes TEXT,
  p_total_amount DECIMAL
) 
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Generate a new UUID
  SELECT uuid_generate_v4() INTO new_id;
  
  -- Direct SQL insertion bypassing the schema cache
  EXECUTE format(
    'INSERT INTO orders (id, customer_name, order_date, required_date, status, notes, total_amount, created_at) 
     VALUES (%L, %L, %L, %L, %L, %L, %L, CURRENT_TIMESTAMP)',
    new_id, p_customer_name, p_order_date, p_required_date, p_status, p_notes, p_total_amount
  );
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create function to simplify SQL function creation
CREATE OR REPLACE FUNCTION create_order_function()
RETURNS VOID AS $$
BEGIN
  -- This is a wrapper function that's called from JavaScript
  -- to create the insert_order function if it doesn't exist
  
  -- The actual implementation is handled by insert_order
  -- This just exists to provide a clear API
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Force a schema cache refresh
SELECT pg_sleep(0.5);
SELECT pg_notify('pgrst', 'reload schema');

-- Step 5: Verify schema
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders'; 