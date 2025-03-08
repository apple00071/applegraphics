# Order Items Table Fix

## Issue

The application is encountering an error when trying to access the `order_items` table:

```
relation "public.order_items" does not exist
```

This error occurs because:
1. The `order_items` table is missing in the Supabase database
2. The application code is trying to interact with this non-existent table

## Solution

The solution involves two main components:

1. Creating the missing `order_items` table in Supabase
2. Adding helper functions to make the application more resilient

## How to Fix

### Step 1: Create the Missing Table

Run the following SQL in your Supabase SQL Editor:

```sql
-- Check if table exists first to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'order_items'
    ) THEN
        -- Create the order_items table
        CREATE TABLE order_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
            material_id UUID REFERENCES materials(id),
            quantity INTEGER DEFAULT 0,
            unit_price DECIMAL(10, 2) DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE 'order_items table created successfully';
    ELSE
        RAISE NOTICE 'order_items table already exists';
    END IF;
END
$$;

-- Force refresh the schema cache
SELECT pg_sleep(0.5);
SELECT pg_notify('pgrst', 'reload schema');
```

### Step 2: Create Helper Functions for Order Items

Then run this SQL to create helper functions that provide alternative ways to interact with order items:

```sql
-- Create function to insert order items directly
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
  EXECUTE 'INSERT INTO order_items (id, order_id, material_id, quantity, unit_price, created_at) 
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)'
  USING new_id, order_id_param, material_id_param, quantity_param, unit_price_param;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to retrieve order items
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

-- Force refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');
```

### Step 3: Restart the Application

After applying these SQL changes, restart your application to ensure it recognizes the new table and functions.

## Explanation

This solution fixes the issue in two ways:

1. **Create the Missing Table**: The primary fix is creating the `order_items` table that matches the expected structure in the application.

2. **Add Resilience**: The helper functions provide alternative ways to interact with the table, bypassing potential schema cache issues.

The application has been updated to use these helper functions as fallbacks when direct table access fails, making it more robust against schema-related issues.

## Verifying the Fix

You should see the following log message after creating an order with items:
```
Successfully inserted order items directly
```

Or if using the fallback method:
```
Successfully inserted all items using direct functions
```

When viewing an order, you should now see the order items listed correctly without errors. 