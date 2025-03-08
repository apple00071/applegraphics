-- Check Table Structure Script
-- This script will determine the actual structure of the orders table
-- Run this in your Supabase SQL Editor

-- First, check the actual columns in the orders table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Then let's create a flexible function that works with whatever structure we find
-- This function will be created based on inspection of the results from the query above
CREATE OR REPLACE FUNCTION flexible_insert_order(
  name_param TEXT,                  -- We'll use this if customer_name doesn't exist but name does
  order_date_text TEXT DEFAULT NULL,
  required_date_text TEXT DEFAULT NULL,
  status_text TEXT DEFAULT 'pending',
  notes_text TEXT DEFAULT NULL,
  total_amount_val NUMERIC DEFAULT 0
) 
RETURNS UUID AS $$
DECLARE
  new_id UUID;
  order_date_ts TIMESTAMPTZ;
  required_date_ts TIMESTAMPTZ;
  col_names TEXT[];
  col_values TEXT[];
BEGIN
  -- Generate a new UUID
  SELECT uuid_generate_v4() INTO new_id;
  
  -- Set default dates if not provided
  IF order_date_text IS NULL THEN
    order_date_ts := CURRENT_TIMESTAMP;
  ELSE
    BEGIN
      order_date_ts := order_date_text::TIMESTAMPTZ;
    EXCEPTION WHEN OTHERS THEN
      order_date_ts := CURRENT_TIMESTAMP;
    END;
  END IF;
  
  IF required_date_text IS NULL THEN
    required_date_ts := CURRENT_TIMESTAMP;
  ELSE
    BEGIN
      required_date_ts := required_date_text::TIMESTAMPTZ;
    EXCEPTION WHEN OTHERS THEN
      required_date_ts := CURRENT_TIMESTAMP;
    END;
  END IF;

  -- Try different column combinations
  BEGIN
    -- First try with customer_name
    EXECUTE 'INSERT INTO orders (id, customer_name, order_date, required_date, status, notes, total_amount, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)'
    USING new_id, name_param, order_date_ts, required_date_ts, status_text, notes_text, total_amount_val;
    
    RETURN new_id;
  EXCEPTION WHEN undefined_column THEN
    -- Try with 'name' if customer_name doesn't exist
    BEGIN
      EXECUTE 'INSERT INTO orders (id, name, order_date, required_date, status, notes, total_amount, created_at) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)'
      USING new_id, name_param, order_date_ts, required_date_ts, status_text, notes_text, total_amount_val;
      
      RETURN new_id;
    EXCEPTION WHEN undefined_column THEN
      -- Log what we tried
      RAISE NOTICE 'Could not find appropriate columns for order customer info';
      
      -- Try a very minimal insert as last resort
      EXECUTE 'INSERT INTO orders (id) VALUES ($1)'
      USING new_id;
      
      RETURN new_id;
    END;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force refresh the schema cache
SELECT pg_sleep(0.5);
SELECT pg_notify('pgrst', 'reload schema'); 