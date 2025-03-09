-- Add the new columns to the materials table
ALTER TABLE materials ADD COLUMN IF NOT EXISTS model_number VARCHAR(50);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS empty_card_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS offset_printing_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS multi_color_price DECIMAL(10,2) DEFAULT 0;

-- Update comment to explain the SKU format
COMMENT ON COLUMN materials.sku IS 'Format: AG_SUP_MOD_XXYYZZ. SUP=3 chars of supplier, MOD=3 chars of model, XX=empty card price, YY=offset printing price, ZZ=multi-color price'; 