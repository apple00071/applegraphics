-- Create table for storing dynamic dropdown options
CREATE TABLE IF NOT EXISTS public.dropdown_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL, -- 'product_name', 'binding_type', 'paper_quality'
    value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, value)
);

-- Enable Row Level Security
ALTER TABLE public.dropdown_options ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
DROP POLICY IF EXISTS "Allow read access for all" ON public.dropdown_options;
CREATE POLICY "Allow read access for all" ON public.dropdown_options
    FOR SELECT TO anon, authenticated USING (true);

-- Allow write access to everyone (for now, based on current local auth model)
DROP POLICY IF EXISTS "Allow write access for all" ON public.dropdown_options;
CREATE POLICY "Allow write access for all" ON public.dropdown_options
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed initial data
INSERT INTO public.dropdown_options (category, value) VALUES
    -- Product Names
    ('product_name', 'Bill Book'),
    ('product_name', 'Letterhead'),
    ('product_name', 'Visiting Card'),
    ('product_name', 'Flyer'),
    ('product_name', 'Brochure'),
    ('product_name', 'Debit Note'),
    ('product_name', 'Delivery Challan'),
    ('product_name', 'Receipt Book'),
    
    -- Binding Types
    ('binding_type', 'Perfect Binding'),
    ('binding_type', 'Spiral'),
    ('binding_type', 'Center Staple'),
    ('binding_type', 'Hard Bound'),
    ('binding_type', 'Glue Padding'),
    ('binding_type', 'None'),
    
    -- Paper Qualities
    ('paper_quality', '70 GSM'),
    ('paper_quality', '75 GSM'),
    ('paper_quality', '80 GSM'),
    ('paper_quality', '90 GSM'),
    ('paper_quality', '100 GSM'),
    ('paper_quality', 'Art Paper'),
    ('paper_quality', 'Matte'),
    ('paper_quality', 'Glossy'),

    -- Paper Colors
    ('paper_color', 'White'),
    ('paper_color', 'Yellow'),
    ('paper_color', 'Pink'),
    ('paper_color', 'Green'),
    ('paper_color', 'Blue'),

    -- Printing Types (Machines)
    ('printing_type', 'Offset Printing'),
    ('printing_type', 'Digital Printing'),
    ('printing_type', 'Screen Printing'),
    ('printing_type', 'Large Format')
ON CONFLICT (category, value) DO NOTHING;
