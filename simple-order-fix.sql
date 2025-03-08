-- Extremely Simple Order Function
-- This is a minimal version that should work regardless of parameter issues
-- Run this in your Supabase SQL Editor

-- Drop existing functions first
DROP FUNCTION IF EXISTS direct_insert_order;
DROP FUNCTION IF EXISTS test_order_params;

-- Create a very simple function with minimal parameters
CREATE OR REPLACE FUNCTION simple_insert_order(
  customer_name_param TEXT,
  notes_param TEXT DEFAULT NULL
) 
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Generate a new UUID
  SELECT uuid_generate_v4() INTO new_id;
  
  -- Directly execute SQL statement with minimal required fields
  -- Default values will be used for other fields
  EXECUTE 'INSERT INTO orders (id, customer_name, order_date, required_date, status, notes, total_amount, created_at) 
           VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ''pending'', $3, 0, CURRENT_TIMESTAMP)'
  USING new_id, customer_name_param, notes_param;
  
  -- Return the new order ID
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force refresh the schema cache
SELECT pg_sleep(0.5);
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the function was created
SELECT proname, pronargs FROM pg_proc WHERE proname = 'simple_insert_order'; 