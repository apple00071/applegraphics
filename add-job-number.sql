-- Add job_number field to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS job_number TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_job_number 
ON orders(job_number);

-- Update the orders table to handle job numbers in functions
CREATE OR REPLACE FUNCTION direct_insert_order(
  customer_name_param TEXT,
  order_date_param TIMESTAMPTZ,
  required_date_param TIMESTAMPTZ,
  status_param TEXT,
  notes_param TEXT,
  total_amount_param DECIMAL,
  job_number_param TEXT DEFAULT NULL
) 
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Generate a new UUID
  SELECT uuid_generate_v4() INTO new_id;
  
  -- Directly execute SQL statement to insert the order
  -- This bypasses the schema cache completely
  EXECUTE 'INSERT INTO orders (id, customer_name, order_date, required_date, status, notes, total_amount, created_at, job_number) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)'
  USING new_id, customer_name_param, order_date_param, required_date_param, status_param, notes_param, total_amount_param, job_number_param;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the flexible insert function to include job number
CREATE OR REPLACE FUNCTION flexible_insert_order(
  name_param TEXT,
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
    -- First try with customer_name and job_number
    EXECUTE 'INSERT INTO orders (id, customer_name, order_date, required_date, status, notes, total_amount, created_at, job_number) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)'
    USING new_id, name_param, order_date_ts, required_date_ts, status_text, notes_text, total_amount_val, job_number_text;
    
    RETURN new_id;
  EXCEPTION WHEN undefined_column THEN
    -- Try with 'name' if customer_name doesn't exist
    BEGIN
      EXECUTE 'INSERT INTO orders (id, name, order_date, required_date, status, notes, total_amount, created_at, job_number) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)'
      USING new_id, name_param, order_date_ts, required_date_ts, status_text, notes_text, total_amount_val, job_number_text;
      
      RETURN new_id;
    EXCEPTION WHEN undefined_column THEN
      -- Log what we tried
      RAISE NOTICE 'Could not find appropriate columns for order customer info';
      
      -- Try a very minimal insert as last resort
      EXECUTE 'INSERT INTO orders (id, job_number) VALUES ($1, $2)'
      USING new_id, job_number_text;
      
      RETURN new_id;
    END;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force refresh the schema cache
SELECT pg_sleep(0.5);
SELECT pg_notify('pgrst', 'reload schema'); 