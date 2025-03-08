-- Direct Insert Fix
-- This is a simplified version focused solely on bypassing schema cache issues
-- Run this in your Supabase SQL Editor

-- Create a function that inserts an order directly using SQL
-- This completely bypasses the schema cache
CREATE OR REPLACE FUNCTION direct_insert_order(
  customer_name_param TEXT,
  order_date_param TIMESTAMPTZ,
  required_date_param TIMESTAMPTZ,
  status_param TEXT,
  notes_param TEXT,
  total_amount_param DECIMAL
) 
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Generate a new UUID
  SELECT uuid_generate_v4() INTO new_id;
  
  -- Directly execute SQL statement to insert the order
  -- This bypasses the schema cache completely
  EXECUTE 'INSERT INTO orders (id, customer_name, order_date, required_date, status, notes, total_amount, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)'
  USING new_id, customer_name_param, order_date_param, required_date_param, status_param, notes_param, total_amount_param;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force refresh the schema cache
SELECT pg_sleep(0.5);
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the orders table exists and has the right structure
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name = 'orders'; 