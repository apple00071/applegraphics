-- Improved Order Function Fix
-- This is a more robust version of the direct_insert_order function
-- Run this in your Supabase SQL Editor

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS direct_insert_order;

-- Create a more robust function with better error handling
CREATE OR REPLACE FUNCTION direct_insert_order(
  customer_name_param TEXT,
  order_date_param TEXT, -- Changed to TEXT for easier JSON handling
  required_date_param TEXT, -- Changed to TEXT for easier JSON handling
  status_param TEXT,
  notes_param TEXT,
  total_amount_param NUMERIC -- Changed to NUMERIC for better compatibility
) 
RETURNS UUID AS $$
DECLARE
  new_id UUID;
  order_date_ts TIMESTAMPTZ;
  required_date_ts TIMESTAMPTZ;
BEGIN
  -- Generate a new UUID
  SELECT uuid_generate_v4() INTO new_id;
  
  -- Convert text dates to timestamps
  BEGIN
    order_date_ts := order_date_param::TIMESTAMPTZ;
    required_date_ts := required_date_param::TIMESTAMPTZ;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid date format: order_date=%, required_date=%', 
      order_date_param, required_date_param;
  END;
  
  -- Check for required parameters
  IF customer_name_param IS NULL OR customer_name_param = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  
  -- Directly execute SQL statement to insert the order
  -- This bypasses the schema cache completely
  BEGIN
    EXECUTE 'INSERT INTO orders (id, customer_name, order_date, required_date, status, notes, total_amount, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)'
    USING new_id, customer_name_param, order_date_ts, required_date_ts, status_param, notes_param, total_amount_param;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error inserting order: %', SQLERRM;
  END;
  
  -- Return the new order ID
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a simple test function that logs all parameters for debugging
CREATE OR REPLACE FUNCTION test_order_params(
  customer_name_param TEXT,
  order_date_param TEXT,
  required_date_param TEXT,
  status_param TEXT,
  notes_param TEXT,
  total_amount_param NUMERIC
) 
RETURNS TEXT AS $$
BEGIN
  RETURN format('Params received: customer=%s, order_date=%s, required_date=%s, status=%s, notes=%s, total=%s', 
    customer_name_param, order_date_param, required_date_param, 
    status_param, notes_param, total_amount_param::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force refresh the schema cache
SELECT pg_sleep(0.5);
SELECT pg_notify('pgrst', 'reload schema');

-- Confirm the function exists
SELECT proname, proargtypes, prosrc FROM pg_proc 
WHERE proname = 'direct_insert_order'; 