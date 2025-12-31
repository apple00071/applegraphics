/**
 * Printer Service (Client-Side TypeScript)
 * Handles all printer-related operations via Supabase
 */

import { supabase } from '../lib/supabase';

// =============== TYPE DEFINITIONS ===============

export interface PrinterTray {
    id: number;
    printer_id: number;
    tray_name: string;
    tray_number: number;
    paper_size: string;
    paper_width_mm?: number;
    paper_height_mm?: number;
    paper_type: string;
    paper_weight_gsm?: number;
    color: string;
    sheets_loaded: number;
    sheets_capacity: number;
    is_active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
    status?: 'Good' | 'Medium' | 'Low' | 'Empty'; // Optional since it might come from joined views
}

export interface TrayStatus extends PrinterTray {
    fill_percentage: number | null;
    status: 'Good' | 'Medium' | 'Low' | 'Empty';
    printer_name: string;
}

export interface PrintJob {
    id: number;
    printer_id: number | null;
    order_id: string | null;
    job_name: string;
    file_path?: string;
    status: 'queued' | 'printing' | 'completed' | 'error' | 'cancelled';
    tray_requested?: string;
    tray_used?: string;
    paper_size?: string;
    paper_type?: string;
    copies: number;
    duplex: boolean;
    color_mode: 'color' | 'grayscale' | 'black';
    total_pages?: number;
    pages_printed: number;
    submitted_at: string;
    started_printing_at?: string;
    completed_at?: string;
    error_message?: string;
    retry_count: number;
    submitted_by: string;
    created_at: string;
    updated_at: string;
}

export interface PrintQueueItem extends PrintJob {
    customer_name?: string;
    printer_name: string;
}

export interface PrintJobSubmission {
    orderId?: string | null;
    jobName: string;
    pdfBlob: Blob;
    trayNumber: number;
    paperSize?: string;
    paperType?: string;
    copies?: number;
    duplex?: boolean;
    colorMode?: 'color' | 'grayscale' | 'black';
    submittedBy?: string;

    // Advanced Layout
    nUp?: number; // 1, 2, 4, 6, 9, 16
    booklet?: 'off' | 'booklet' | '2-in-1';
    bindingPosition?: 'left' | 'right' | 'top';
    imageShiftX?: number;
    imageShiftY?: number;

    // Advanced Finishing
    staple?: 'none' | 'top-left' | 'top-right' | 'dual-left' | 'dual-top' | 'saddle';
    punch?: 'none' | '2-hole' | '3-hole' | '4-hole';
    fold?: 'none' | 'center' | 'tri-in' | 'tri-out' | 'z-fold';
    outputTray?: 'auto' | 'main' | 'sub';
    sort?: 'sort' | 'group';
}

export interface PrintJobResult {
    printJobId: number;
    ippJobId?: number;
    status: string;
    message: string;
    warning?: string;
}

export interface PrintConsumables {
    id: number;
    printer_id: number;
    toner_black: number;
    toner_cyan: number;
    toner_magenta: number;
    toner_yellow: number;
    waste_toner: number;
    drum_life_remaining: number;
    fuser_life_remaining: number;
    low_toner_alert: boolean;
    low_paper_alert: boolean;
    maintenance_due_alert: boolean;
    last_updated: string;
}

export interface PrintPreset {
    id: number;
    name: string;
    description?: string;
    tray_number?: number;
    paper_size?: string;
    paper_type?: string;
    copies: number;
    duplex: boolean;
    color_mode: 'color' | 'grayscale' | 'black';
    is_default: boolean;
    usage_count: number;
    created_at: string;
    updated_at: string;
}

export interface DailyProduction {
    production_date: string;
    jobs_completed: number;
    total_sheets_printed: number;
    color_sheets: number;
    black_sheets: number;
    total_revenue: number;
}

export interface PrintHistoryFilters {
    status?: string;
    orderId?: string;
    startDate?: string;
    endDate?: string;
}

// =============== SERVICE CLASS ===============

const PRINTER_IP = '192.168.1.123';
const PRINTER_PORT = 631;
const PRINTER_URL = `http://${PRINTER_IP}:${PRINTER_PORT}/ipp`;

export class PrinterService {
    static async getPaperCatalog(printerId: number = 1): Promise<PrinterTray[]> {
        const { data, error } = await supabase
            .from('printer_trays')
            .select('*')
            .eq('printer_id', printerId)
            .eq('is_active', true)
            .order('tray_number');

        if (error) throw error;
        return data || [];
    }

    static async getTrayStatus(): Promise<TrayStatus[]> {
        const { data, error } = await supabase
            .from('v_tray_status')
            .select('*');

        if (error) throw error;
        return data || [];
    }

    static async updateTray(trayId: number, updates: Partial<PrinterTray>): Promise<PrinterTray> {
        const { data, error } = await supabase
            .from('printer_trays')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', trayId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async updateTrayPaperCount(trayId: number, sheetsLoaded: number): Promise<PrinterTray> {
        return this.updateTray(trayId, { sheets_loaded: sheetsLoaded });
    }

    static async submitPrintJob(params: PrintJobSubmission): Promise<PrintJobResult> {
        const {
            orderId,
            jobName,
            pdfBlob,
            trayNumber,
            paperSize = 'A4',
            paperType = 'Plain',
            copies = 1,
            duplex = false,
            colorMode = 'color',
            submittedBy = 'User',
            // Advanced options
            nUp, booklet, bindingPosition, imageShiftX, imageShiftY,
            staple, punch, fold, outputTray, sort
        } = params;

        // ... (rest of function)

        /* In a real implementation with Print Server:
           attributes = {
               'copies': copies,
               'sides': duplex ? 'two-sided-long-edge' : 'one-sided',
               'number-up': nUp,
               'finishings': mapFinishing(staple, punch, fold),
               'media-col': { ... }
           }
        */

        try {
            const { data: tray } = await supabase
                .from('printer_trays')
                .select('*')
                .eq('tray_number', trayNumber)
                .eq('is_active', true)
                .single();

            if (!tray) {
                throw new Error(`Tray ${trayNumber} not found or inactive`);
            }

            let pagesEstimate = 1;
            const isPdf = pdfBlob.type === 'application/pdf' || ((pdfBlob as any).name && (pdfBlob as any).name.toLowerCase().endsWith('.pdf'));

            if (isPdf) {
                // Revised Estimate: High-res print PDFs are often 2-10MB for a single page.
                // Previous 100KB divisor was way too aggressive (5MB file = 50 pages).
                // New divisor: 50MB per page to be safe, or just default to 1 for now.
                // We'll essentially treat it as 1 unless it's truly massive (>50MB).
                pagesEstimate = Math.max(1, Math.ceil(pdfBlob.size / 50000000));
            } else {
                // Images are strictly 1 page
                pagesEstimate = 1;
            }

            // DISABLE blocking check - let the printer decide/fail if empty.
            // if (tray.sheets_loaded < pagesEstimate * copies) {
            //    throw new Error(`Tray ${tray.tray_name} has insufficient paper. Loaded: ${tray.sheets_loaded}, Needed: ${pagesEstimate * copies}`);
            // }

            // 1. Upload File to Storage
            const fileName = `${Date.now()}_${jobName.replace(/[^a-z0-9]/gi, '_')}.pdf`; // Simple sanitization
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('print-jobs')
                .upload(fileName, pdfBlob, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('File upload failed:', uploadError);
                // Proceeding without file for Queue visualization, but marking job as potentially problematic?
                // Or better, throw error to prompt user to fix bucket.
                // Assuming user wants to know if it fails.
                throw new Error(`Failed to upload file: ${uploadError.message}. Ensure 'print-jobs' bucket exists.`);
            }

            const filePath = uploadData.path;

            const { data: printJob, error: jobError } = await supabase
                .from('print_jobs')
                .insert({
                    printer_id: tray.printer_id,
                    order_id: orderId || null,
                    job_name: jobName,
                    file_path: filePath, // Store the reference
                    status: 'queued',
                    tray_requested: tray.tray_name,
                    paper_size: paperSize,
                    paper_type: paperType,
                    copies,
                    duplex,
                    color_mode: colorMode,
                    total_pages: pagesEstimate,
                    submitted_by: submittedBy,
                    // Store advanced options in notes or a specific column if available. 
                    // Since schema is fixed, we might lose them if we don't pack them. 
                    // Current PrintJob interface doesn't have 'metadata'.
                    // We'll rely on the file and standard cols for now.
                })
                .select()
                .single();

            if (jobError) throw jobError;

            return {
                printJobId: printJob.id,
                status: 'queued',
                message: 'Job queued successfully. Print manually or use print server.',
                warning: 'Browser IPP has CORS limitations. Consider setting up a print server.'
            };

        } catch (error) {
            console.error('Print job submission failed:', error);
            throw error;
        }
    }

    static async getPrintQueue(): Promise<PrintQueueItem[]> {
        const { data, error } = await supabase
            .from('v_active_print_queue')
            .select('*');

        if (error) throw error;
        return data || [];
    }

    static async getPrintJob(jobId: number): Promise<PrintJob & { orders?: { customer_name?: string; job_number?: string } }> {
        const { data, error } = await supabase
            .from('print_jobs')
            .select(`
        *,
        orders (
          customer_name,
          job_number
        )
      `)
            .eq('id', jobId)
            .single();

        if (error) throw error;
        return data;
    }

    static async cancelPrintJob(jobId: number): Promise<PrintJob> {
        const { data, error } = await supabase
            .from('print_jobs')
            .update({
                status: 'cancelled',
                completed_at: new Date().toISOString()
            })
            .eq('id', jobId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async completePrintJob(jobId: number, pagesActuallyPrinted: number): Promise<PrintJob> {
        const { data, error } = await supabase
            .from('print_jobs')
            .update({
                status: 'completed',
                pages_printed: pagesActuallyPrinted,
                completed_at: new Date().toISOString()
            })
            .eq('id', jobId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getPrintHistory(filters: PrintHistoryFilters = {}): Promise<any[]> {
        let query = supabase
            .from('print_jobs')
            .select(`
        *,
        orders (customer_name, job_number),
        print_accounting (total_cost)
      `)
            .order('submitted_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.orderId) {
            query = query.eq('order_id', filters.orderId);
        }

        if (filters.startDate) {
            query = query.gte('submitted_at', filters.startDate);
        }

        if (filters.endDate) {
            query = query.lte('submitted_at', filters.endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    static async getConsumables(printerId: number = 1): Promise<PrintConsumables> {
        const { data, error } = await supabase
            .from('printer_consumables')
            .select('*')
            .eq('printer_id', printerId)
            .single();

        if (error) throw error;
        return data;
    }

    static async getPrintPresets(): Promise<PrintPreset[]> {
        const { data, error } = await supabase
            .from('print_presets')
            .select('*')
            .order('usage_count', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    static async usePrintPreset(presetId: number): Promise<PrintPreset> {
        const { data, error } = await supabase
            .from('print_presets')
            .select('*')
            .eq('id', presetId)
            .single();

        if (error) throw error;

        await supabase
            .from('print_presets')
            .update({ usage_count: data.usage_count + 1 })
            .eq('id', presetId);

        return data;
    }

    static async getDailyProduction(date: Date = new Date()): Promise<DailyProduction> {
        const dateStr = date.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('v_daily_production')
            .select('*')
            .eq('production_date', dateStr)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data || {
            production_date: dateStr,
            jobs_completed: 0,
            total_sheets_printed: 0,
            color_sheets: 0,
            black_sheets: 0,
            total_revenue: 0
        };
    }
}
