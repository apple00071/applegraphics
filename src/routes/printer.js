/**
 * Printer API Routes
 * RESTful API for print management system
 */

import express from 'express';
import { PrinterService } from '../services/printerService.js';
import multer from 'multer';
import { readFileSync } from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// =====================================================
// PAPER CATALOG ENDPOINTS
// =====================================================

/**
 * GET /api/printer/catalog
 * Get Paper Catalog (all trays)
 */
router.get('/catalog', async (req, res) => {
    try {
        const catalog = await PrinterService.getPaperCatalog();
        res.json({ success: true, data: catalog });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/printer/catalog/status
 * Get Tray Status Overview
 */
router.get('/catalog/status', async (req, res) => {
    try {
        const status = await PrinterService.getTrayStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/printer/catalog/:trayId
 * Update tray configuration
 */
router.put('/catalog/:trayId', async (req, res) => {
    try {
        const { trayId } = req.params;
        const updates = req.body;

        const updatedTray = await PrinterService.updateTray(parseInt(trayId), updates);
        res.json({ success: true, data: updatedTray });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/printer/catalog/:trayId/paper-count
 * Update paper count (manual paper loading)
 */
router.put('/catalog/:trayId/paper-count', async (req, res) => {
    try {
        const { trayId } = req.params;
        const { sheetsLoaded } = req.body;

        const updatedTray = await PrinterService.updateTrayPaperCount(
            parseInt(trayId),
            parseInt(sheetsLoaded)
        );
        res.json({ success: true, data: updatedTray });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// PRINT JOB ENDPOINTS
// =====================================================

/**
 * POST /api/printer/jobs
 * Submit a new print job
 */
router.post('/jobs', upload.single('pdf'), async (req, res) => {
    try {
        const {
            orderId,
            jobName,
            trayNumber,
            paperSize,
            paperType,
            copies,
            duplex,
            colorMode,
            submittedBy
        } = req.body;

        let pdfBuffer;
        let filePath;

        // Get PDF buffer from upload or file path
        if (req.file) {
            pdfBuffer = readFileSync(req.file.path);
            filePath = req.file.path;
        } else if (req.body.filePath) {
            pdfBuffer = readFileSync(req.body.filePath);
            filePath = req.body.filePath;
        } else {
            throw new Error('No PDF file provided');
        }

        const result = await PrinterService.submitPrintJob({
            orderId: orderId || null,
            jobName,
            filePath,
            pdfBuffer,
            trayNumber: parseInt(trayNumber),
            paperSize,
            paperType,
            copies: parseInt(copies) || 1,
            duplex: duplex === 'true' || duplex === true,
            colorMode: colorMode || 'color',
            submittedBy: submittedBy || 'User'
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Print job error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/printer/jobs
 * Get print queue (active jobs)
 */
router.get('/jobs', async (req, res) => {
    try {
        const queue = await PrinterService.getPrintQueue();
        res.json({ success: true, data: queue });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/printer/jobs/:jobId
 * Get print job details
 */
router.get('/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await PrinterService.getPrintJob(parseInt(jobId));
        res.json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/printer/jobs/:jobId/cancel
 * Cancel a print job
 */
router.put('/jobs/:jobId/cancel', async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await PrinterService.cancelPrintJob(parseInt(jobId));
        res.json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/printer/jobs/:jobId/complete
 * Mark job as completed
 */
router.put('/jobs/:jobId/complete', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { pagesPrinted } = req.body;

        const job = await PrinterService.completePrintJob(
            parseInt(jobId),
            parseInt(pagesPrinted)
        );
        res.json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// PRINT HISTORY & REPORTS
// =====================================================

/**
 * GET /api/printer/history
 * Get print history with filters
 */
router.get('/history', async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            orderId: req.query.orderId,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const history = await PrinterService.getPrintHistory(filters);
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/printer/reports/daily
 * Get daily production report
 */
router.get('/reports/daily', async (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const report = await PrinterService.getDailyProduction(date);
        res.json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// CONSUMABLES & STATUS
// =====================================================

/**
 * GET /api/printer/consumables
 * Get consumables status (toner, paper levels)
 */
router.get('/consumables', async (req, res) => {
    try {
        const consumables = await PrinterService.getConsumables();
        res.json({ success: true, data: consumables });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// PRINT PRESETS
// =====================================================

/**
 * GET /api/printer/presets
 * Get print presets
 */
router.get('/presets', async (req, res) => {
    try {
        const presets = await PrinterService.getPrintPresets();
        res.json({ success: true, data: presets });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/printer/presets/:presetId/use
 * Use a print preset (increments usage count)
 */
router.post('/presets/:presetId/use', async (req, res) => {
    try {
        const { presetId } = req.params;
        const preset = await PrinterService.usePrintPreset(parseInt(presetId));
        res.json({ success: true, data: preset });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
