-- Order Items Functions
-- This script adds helper functions for dealing with order items
-- Run this in your Supabase SQL Editor

-- Function to insert an order item directly using SQL
CREATE OR REPLACE FUNCTION direct_insert_order_item(
  order_id_param UUID,
  material_id_param UUID,
  quantity_param INTEGER,
  unit_price_param DECIMAL
) 
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Generate a new UUID
  SELECT uuid_generate_v4() INTO new_id;
  
  -- Directly execute SQL statement to insert the order item
  -- This bypasses the schema cache completely
  EXECUTE 'INSERT INTO order_items (id, order_id, material_id, quantity, unit_price, created_at) 
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)'
  USING new_id, order_id_param, material_id_param, quantity_param, unit_price_param;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get order items for a specific order
CREATE OR REPLACE FUNCTION get_order_items(
  order_id_param UUID
) 
RETURNS TABLE (
  id UUID,
  order_id UUID,
  material_id UUID,
  quantity INTEGER,
  unit_price DECIMAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY EXECUTE 
    'SELECT id, order_id, material_id, quantity, unit_price, created_at 
     FROM order_items 
     WHERE order_id = $1'
  USING order_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force refresh the schema cache
SELECT pg_sleep(0.5);
SELECT pg_notify('pgrst', 'reload schema'); 