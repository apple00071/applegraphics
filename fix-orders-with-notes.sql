-- Fix for orders table to properly handle notes

-- 1. Make sure the orders table has all the columns we need
DO $$
BEGIN
  -- Add notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN notes TEXT;
    RAISE NOTICE 'Added notes column to orders table';
  END IF;
  
  -- Add job_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'job_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN job_number TEXT;
    RAISE NOTICE 'Added job_number column to orders table';
  END IF;
  
  -- Add customer_name column if it doesn't exist (might use name instead)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_name'
  ) THEN
    -- Check if name column exists as an alternative
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'name'
    ) THEN
      ALTER TABLE orders ADD COLUMN customer_name TEXT;
      RAISE NOTICE 'Added customer_name column to orders table';
    END IF;
  END IF;
END $$;

-- 2. Create a new, more robust, function for order insertion
CREATE OR REPLACE FUNCTION insert_order_v2(
  customer_name_param TEXT,
  order_date_text TEXT DEFAULT NULL,
  required_date_text TEXT DEFAULT NULL,
  status_text TEXT DEFAULT 'pending',
  notes_text TEXT DEFAULT NULL,
  total_amount_val NUMERIC DEFAULT 0,
  job_number_text TEXT DEFAULT NULL
) 
RETURNS UUID AS $$
DECLARE
  new_id UUID;
  order_date_ts TIMESTAMPTZ;
  required_date_ts TIMESTAMPTZ;
  customer_column_name TEXT;
BEGIN
  -- Generate a new UUID
  SELECT uuid_generate_v4() INTO new_id;
  
  -- Parse dates
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
  
  -- Determine which customer column to use (customer_name or name)
  SELECT cols.column_name INTO customer_column_name
  FROM information_schema.columns cols
  WHERE cols.table_name = 'orders' 
  AND cols.column_name IN ('customer_name', 'name')
  LIMIT 1;
  
  -- Insert the order with dynamic column names
  IF customer_column_name = 'customer_name' THEN
    EXECUTE 'INSERT INTO orders (id, customer_name, order_date, required_date, status, notes, total_amount, created_at, job_number) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
             RETURNING id'
    USING new_id, customer_name_param, order_date_ts, required_date_ts, status_text, notes_text, total_amount_val, job_number_text
    INTO new_id;
  ELSE
    EXECUTE 'INSERT INTO orders (id, name, order_date, required_date, status, notes, total_amount, created_at, job_number) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
             RETURNING id'
    USING new_id, customer_name_param, order_date_ts, required_date_ts, status_text, notes_text, total_amount_val, job_number_text
    INTO new_id;
  END IF;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Update all existing orders with missing notes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT id, job_number FROM orders WHERE notes IS NULL AND job_number IS NOT NULL) LOOP
    -- Create formatted notes from available data
    UPDATE orders 
    SET notes = '=== PRINT SPECIFICATIONS ===' || 
                CHR(10) || 'Job Number: ' || COALESCE(r.job_number, 'N/A') || 
                CHR(10) || 'Product Name: N/A' ||
                CHR(10) || 'Printing Date: N/A' ||
                CHR(10) || 'Quantity: N/A' ||
                CHR(10) || 'Numbering: N/A' ||
                CHR(10) || 'Binding Type: N/A' ||
                CHR(10) || 'Paper Quality: N/A' ||
                CHR(10) || 'Number of Pages: N/A' ||
                CHR(10) || CHR(10) ||
                '=== CONTACT INFORMATION ===' ||
                CHR(10) || 'Contact: N/A' ||
                CHR(10) || 'Email: N/A' ||
                CHR(10) || CHR(10) ||
                '=== ADDITIONAL NOTES ===' ||
                CHR(10) || 'Order restored from missing notes.'
    WHERE id = r.id;
    
    RAISE NOTICE 'Updated order % with formatted notes', r.id;
  END LOOP;
END $$;

-- 4. Refresh the schema cache
SELECT pg_notify('pgrst', 'reload schema'); 