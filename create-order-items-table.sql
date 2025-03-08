-- Create order_items table script
-- This script will create the missing order_items table referenced in your application

-- First check if the table exists to avoid errors
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
        
        -- Add a comment to confirm creation
        COMMENT ON TABLE order_items IS 'Table created to fix missing order_items relation';
        
        RAISE NOTICE 'order_items table created successfully';
    ELSE
        RAISE NOTICE 'order_items table already exists';
    END IF;
END
$$;

-- Force refresh the schema cache
SELECT pg_sleep(0.5);
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the table was created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_items'
ORDER BY ordinal_position; 