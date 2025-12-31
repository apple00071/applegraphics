-- =====================================================
-- Print Management System Database Schema
-- Fiery-like capabilities for Apple Graphics
-- =====================================================

-- =====================================================
-- 1. PRINTER CONFIGURATION
-- =====================================================

-- Store printer information
CREATE TABLE IF NOT EXISTS printers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    port INT DEFAULT 631,
    model VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'online', -- online, offline, error, maintenance
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default Konica Minolta printer
INSERT INTO printers (name, ip_address, model, location, is_default)
VALUES ('Konica Minolta AccurioPress C4070', '192.168.1.123', 'AccurioPress C4070', 'Production Floor', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. PAPER CATALOG (Core Feature)
-- =====================================================

-- Store tray configurations (like Fiery Paper Catalog)
CREATE TABLE IF NOT EXISTS printer_trays (
    id SERIAL PRIMARY KEY,
    printer_id INT REFERENCES printers(id) ON DELETE CASCADE,
    tray_name VARCHAR(50) NOT NULL, -- 'Tray 1', 'Tray 2', 'Tray 3', 'Bypass'
    tray_number INT NOT NULL, -- 1, 2, 3, 4 (for programmatic access)
    paper_size VARCHAR(50) NOT NULL, -- 'A4', 'Letter', '13x19', 'Custom'
    paper_width_mm DECIMAL(10,2), -- For custom sizes
    paper_height_mm DECIMAL(10,2), -- For custom sizes
    paper_type VARCHAR(50) NOT NULL, -- 'Plain', 'Coated', 'Glossy', 'Bond', etc.
    paper_weight_gsm INT, -- 80, 120, 170, etc.
    color VARCHAR(50) DEFAULT 'White', -- 'White', 'Ivory', 'Pink', etc.
    sheets_loaded INT DEFAULT 0,
    sheets_capacity INT DEFAULT 500,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(printer_id, tray_number)
);

-- Create index for fast tray lookups
CREATE INDEX IF NOT EXISTS idx_printer_trays_printer ON printer_trays(printer_id);
CREATE INDEX IF NOT EXISTS idx_printer_trays_active ON printer_trays(printer_id, is_active);

-- Insert default tray configurations for Konica Minolta
INSERT INTO printer_trays (printer_id, tray_name, tray_number, paper_size, paper_type, paper_weight_gsm, color, sheets_loaded, sheets_capacity)
SELECT 
    id,
    unnest(ARRAY['Tray 1', 'Tray 2', 'Tray 3', 'Bypass']),
    unnest(ARRAY[1, 2, 3, 4]),
    unnest(ARRAY['A4', 'A4', 'Tabloid Extra', 'Custom 13x19']),
    unnest(ARRAY['Plain', 'Plain', 'Coated G', 'Coated G']),
    unnest(ARRAY[80, 80, 120, 170]),
    unnest(ARRAY['White', 'White', 'White', 'White']),
    unnest(ARRAY[500, 120, 300, 50]),
    unnest(ARRAY[550, 550, 350, 100])
FROM printers 
WHERE name = 'Konica Minolta AccurioPress C4070'
ON CONFLICT (printer_id, tray_number) DO NOTHING;

-- =====================================================
-- 3. PRINT JOBS (Job Queue & History)
-- =====================================================

CREATE TABLE IF NOT EXISTS print_jobs (
    id SERIAL PRIMARY KEY,
    printer_id INT REFERENCES printers(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,  -- Changed to UUID
    job_name VARCHAR(255) NOT NULL,
    file_path TEXT, -- Path to PDF or file on server
    status VARCHAR(50) DEFAULT 'queued', -- queued, printing, completed, error, cancelled
    
    -- Print Settings
    tray_requested VARCHAR(50), -- User's requested tray
    tray_used VARCHAR(50), -- Actual tray used (from printer)
    paper_size VARCHAR(50),
    paper_type VARCHAR(50),
    copies INT DEFAULT 1,
    duplex BOOLEAN DEFAULT false,
    color_mode VARCHAR(20) DEFAULT 'color', -- color, grayscale, black
    
    -- Job Progress
    total_pages INT,
    pages_printed INT DEFAULT 0,
    
    -- Timestamps
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_printing_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Error Handling
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    -- User Tracking
    submitted_by VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queue operations
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_printer ON print_jobs(printer_id, status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order ON print_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_submitted ON print_jobs(submitted_at DESC);

-- =====================================================
-- 4. JOB ACCOUNTING (Click Tracking & Costing)
-- =====================================================

CREATE TABLE IF NOT EXISTS print_accounting (
    id SERIAL PRIMARY KEY,
    print_job_id INT REFERENCES print_jobs(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,  -- Changed to UUID
    
    -- Click Counting (for billing)
    black_clicks INT DEFAULT 0,
    color_clicks INT DEFAULT 0,
    total_clicks INT DEFAULT 0,
    
    -- Material Usage
    total_sheets INT DEFAULT 0,
    paper_type VARCHAR(50),
    paper_cost_per_sheet DECIMAL(10,4),
    
    -- Cost Calculation
    cost_per_black_click DECIMAL(10,4) DEFAULT 0.50, -- Example: ₹0.50 per black click
    cost_per_color_click DECIMAL(10,4) DEFAULT 2.00, -- Example: ₹2.00 per color click
    paper_cost DECIMAL(10,2),
    click_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    
    -- Timestamps
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_print_accounting_job ON print_accounting(print_job_id);
CREATE INDEX IF NOT EXISTS idx_print_accounting_order ON print_accounting(order_id);
CREATE INDEX IF NOT EXISTS idx_print_accounting_date ON print_accounting(recorded_at);

-- =====================================================
-- 5. CONSUMABLES TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS printer_consumables (
    id SERIAL PRIMARY KEY,
    printer_id INT REFERENCES printers(id) ON DELETE CASCADE,
    
    -- Toner Levels (%)
    toner_black INT DEFAULT 100,
    toner_cyan INT DEFAULT 100,
    toner_magenta INT DEFAULT 100,
    toner_yellow INT DEFAULT 100,
    waste_toner INT DEFAULT 0,
    
    -- Paper Levels (updated from printer_trays)
    -- Stored here for historical tracking
    
    -- Maintenance
    drum_life_remaining INT DEFAULT 100, -- %
    fuser_life_remaining INT DEFAULT 100, -- %
    
    -- Alerts
    low_toner_alert BOOLEAN DEFAULT false,
    low_paper_alert BOOLEAN DEFAULT false,
    maintenance_due_alert BOOLEAN DEFAULT false,
    
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default consumables for Konica Minolta
INSERT INTO printer_consumables (printer_id)
SELECT id FROM printers WHERE name = 'Konica Minolta AccurioPress C4070'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. PRINT QUEUE MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS print_queue_settings (
    id SERIAL PRIMARY KEY,
    printer_id INT REFERENCES printers(id) ON DELETE CASCADE,
    
    -- Queue Behavior
    auto_print BOOLEAN DEFAULT true, -- Auto-start jobs or wait for approval
    max_concurrent_jobs INT DEFAULT 1,
    pause_on_error BOOLEAN DEFAULT true,
    
    -- Default Settings
    default_tray INT DEFAULT 1,
    default_duplex BOOLEAN DEFAULT false,
    default_color_mode VARCHAR(20) DEFAULT 'color',
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(printer_id)
);

-- Insert default queue settings
INSERT INTO print_queue_settings (printer_id)
SELECT id FROM printers WHERE name = 'Konica Minolta AccurioPress C4070'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. PAPER INVENTORY INTEGRATION
-- =====================================================

-- Link paper catalog to materials inventory (optional)
CREATE TABLE IF NOT EXISTS paper_materials_link (
    id SERIAL PRIMARY KEY,
    tray_id INT REFERENCES printer_trays(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,  -- Changed to UUID
    auto_deduct_from_inventory BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tray_id)
);

-- =====================================================
-- 8. PRINT PRESETS (Quick Print Profiles)
-- =====================================================

CREATE TABLE IF NOT EXISTS print_presets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Print Settings
    tray_number INT,
    paper_size VARCHAR(50),
    paper_type VARCHAR(50),
    copies INT DEFAULT 1,
    duplex BOOLEAN DEFAULT false,
    color_mode VARCHAR(20) DEFAULT 'color',
    
    -- Usage
    is_default BOOLEAN DEFAULT false,
    usage_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common presets
INSERT INTO print_presets (name, description, tray_number, paper_size, paper_type, duplex, color_mode)
VALUES 
    ('Invoice - Plain A4', 'Standard invoice printing', 1, 'A4', 'Plain', false, 'color'),
    ('Job Ticket - Coated', 'Production job ticket on coated paper', 2, 'A4', 'Coated', false, 'color'),
    ('Bill Book - Plain', 'Bill book forms on plain paper', 1, 'A4', 'Plain', false, 'black'),
    ('Large Format - Gloss', 'Large format on glossy paper', 4, '13x19', 'Glossy', false, 'color')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update tray paper count when job completes
CREATE OR REPLACE FUNCTION update_tray_paper_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Deduct sheets from tray
        UPDATE printer_trays
        SET sheets_loaded = GREATEST(0, sheets_loaded - (NEW.total_pages * NEW.copies))
        WHERE printer_id = NEW.printer_id 
        AND tray_name = NEW.tray_used;
        
        -- Check for low paper alert
        UPDATE printer_consumables
        SET low_paper_alert = EXISTS (
            SELECT 1 FROM printer_trays 
            WHERE printer_id = NEW.printer_id 
            AND sheets_loaded < (sheets_capacity * 0.2)
        )
        WHERE printer_id = NEW.printer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on print job completion
CREATE TRIGGER trigger_update_tray_paper_count
AFTER UPDATE ON print_jobs
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION update_tray_paper_count();

-- Function to calculate job cost
CREATE OR REPLACE FUNCTION calculate_print_cost(job_id INT)
RETURNS DECIMAL AS $$
DECLARE
    v_total_cost DECIMAL(10,2);
BEGIN
    WITH job_data AS (
        SELECT 
            pj.total_pages,
            pj.copies,
            pj.color_mode,
            pt.paper_type,
            0.10 as paper_cost_per_sheet, -- Example cost
            0.50 as black_click_cost,
            2.00 as color_click_cost
        FROM print_jobs pj
        LEFT JOIN printer_trays pt ON pt.tray_name = pj.tray_used
        WHERE pj.id = job_id
    )
    SELECT 
        (total_pages * copies * paper_cost_per_sheet) +  -- Paper cost
        CASE 
            WHEN color_mode = 'color' THEN (total_pages * copies * color_click_cost)
            ELSE (total_pages * copies * black_click_cost)
        END
    INTO v_total_cost
    FROM job_data;
    
    RETURN COALESCE(v_total_cost, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. VIEWS FOR QUICK ACCESS
-- =====================================================

-- View: Active Print Queue
CREATE OR REPLACE VIEW v_active_print_queue AS
SELECT 
    pj.id,
    pj.job_name,
    pj.status,
    pj.tray_requested,
    pj.total_pages,
    pj.pages_printed,
    pj.copies,
    pj.submitted_at,
    pj.submitted_by,
    o.customer_name,
    p.name as printer_name
FROM print_jobs pj
LEFT JOIN orders o ON pj.order_id = o.id
LEFT JOIN printers p ON pj.printer_id = p.id
WHERE pj.status IN ('queued', 'printing')
ORDER BY pj.submitted_at ASC;

-- View: Tray Status Overview
CREATE OR REPLACE VIEW v_tray_status AS
SELECT 
    pt.tray_name,
    pt.paper_size,
    pt.paper_type,
    pt.paper_weight_gsm,
    pt.color,
    pt.sheets_loaded,
    pt.sheets_capacity,
    ROUND((pt.sheets_loaded::DECIMAL / pt.sheets_capacity) * 100, 1) as fill_percentage,
    CASE 
        WHEN pt.sheets_loaded = 0 THEN 'Empty'
        WHEN pt.sheets_loaded < (pt.sheets_capacity * 0.2) THEN 'Low'
        WHEN pt.sheets_loaded < (pt.sheets_capacity * 0.5) THEN 'Medium'
        ELSE 'Good'
    END as status,
    p.name as printer_name
FROM printer_trays pt
JOIN printers p ON pt.printer_id = p.id
WHERE pt.is_active = true
ORDER BY pt.tray_number;

-- View: Daily Production Report
CREATE OR REPLACE VIEW v_daily_production AS
SELECT 
    DATE(pj.completed_at) as production_date,
    COUNT(*) as jobs_completed,
    SUM(pj.total_pages * pj.copies) as total_sheets_printed,
    SUM(CASE WHEN pj.color_mode = 'color' THEN pj.total_pages * pj.copies ELSE 0 END) as color_sheets,
    SUM(CASE WHEN pj.color_mode != 'color' THEN pj.total_pages * pj.copies ELSE 0 END) as black_sheets,
    SUM(pa.total_cost) as total_revenue
FROM print_jobs pj
LEFT JOIN print_accounting pa ON pj.id = pa.print_job_id
WHERE pj.status = 'completed'
GROUP BY DATE(pj.completed_at)
ORDER BY production_date DESC;

-- =====================================================
-- COMPLETE
-- =====================================================

COMMENT ON TABLE printers IS 'Registered printers in the system';
COMMENT ON TABLE printer_trays IS 'Paper Catalog - defines what paper is loaded in each tray';
COMMENT ON TABLE print_jobs IS 'Print job queue and history';
COMMENT ON TABLE print_accounting IS 'Job costing and click tracking';
COMMENT ON TABLE printer_consumables IS 'Toner and consumable levels';
COMMENT ON TABLE print_presets IS 'Quick print profiles for common jobs';
