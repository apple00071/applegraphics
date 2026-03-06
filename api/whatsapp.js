import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.REACT_APP_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// --- Simple Keyword-based Order Parser (no AI needed) ---
function parseOrderFromMessage(text) {
    const lower = text.toLowerCase();

    // Must contain order-related keywords to be considered an order
    const isOrder = lower.includes('order') || lower.includes('print') || lower.includes('qty') ||
        lower.includes('quantity') || lower.includes('copies');
    if (!isOrder) return null;

    // Extract customer name: capture ONLY first word after 'for' to avoid grabbing machine type
    // e.g. "for pavan riso" → "Pavan" (not "Pavan Riso")
    const nameMatch = text.match(/(?:for|customer[:\s]+)\s+([A-Za-z]+)/i);
    const customer_name = nameMatch ? nameMatch[1].trim() : 'WhatsApp Customer';

    // Extract machine type (checked after name to avoid conflict)
    const machineMap = { konica: 'Konica', riso: 'Riso', flex: 'Flex', offset: 'Offset', multicolor: 'Multicolor' };
    const machine_type = Object.entries(machineMap).find(([k]) => lower.includes(k))?.[1] || 'Konica';

    // Extract quantity: "500 qty", "qty 500", "500 copies", "500 pcs"
    const qtyMatch = text.match(/(\d+)\s*(?:qty|copies|pcs|sheets?)/i) ||
        text.match(/(?:qty|copies|pcs|sheets?)[:\s]+(\d+)/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    // Extract size: A4, A3, A5, custom sizes
    const sizeMatch = text.match(/\b(A[2-6]|[0-9]+\s*x\s*[0-9]+\s*(?:cm|mm|inch)?)\b/i);
    const size = sizeMatch ? sizeMatch[1].toUpperCase() : 'A4';

    // Extract color details
    const colorMatch = text.match(/(?:B&B|B&W|black\s*(?:and|&)\s*white|colou?r|blue|red|green|yellow|gold|silver|full\s*colou?r)[^\r\n]*/i);
    const color_notes = colorMatch ? colorMatch[0].trim() : '';

    const product_name = `${size} Print`;

    return { customer_name, machine_type, product_name, size, quantity, color_notes, is_order: true };
}

// Helper to generate job number
async function generateJobNumber(machineType, productName) {
    const machineCode = (machineType || 'K').charAt(0).toUpperCase();
    const productCode = (productName || 'P').charAt(0).toUpperCase();
    const prefix = `AG${machineCode}${productCode}`;

    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('job_number')
            .like('job_number', `${prefix}%`)
            .order('job_number', { ascending: false })
            .limit(1);

        let nextSequence = 1;
        if (!error && orders && orders.length > 0 && orders[0].job_number) {
            const lastSequence = parseInt(orders[0].job_number.substring(prefix.length), 10);
            if (!isNaN(lastSequence)) nextSequence = lastSequence + 1;
        }
        return `${prefix}${nextSequence.toString().padStart(2, '0')}`;
    } catch {
        return `${prefix}${Date.now().toString().slice(-4)}`;
    }
}

// Helper to send WhatsApp reply via WASender
async function sendWhatsAppReply(to, text) {
    const apiKey = process.env.WASENDER_API_KEY;
    if (!apiKey) return;
    try {
        await fetch('https://www.wasenderapi.com/api/send-message', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, text })
        });
    } catch (err) {
        console.error('❌ Failed to send WhatsApp reply:', err);
    }
}

// Global debug log storage
let recentPayloads = [];

export default async function handler(req, res) {
    const timestamp = new Date().toISOString();
    console.log(`🌐 [${timestamp}] Webhook: ${req.method} ${req.url}`);

    let currentLog = null;
    if (req.method === 'POST') {
        currentLog = { timestamp, headers: req.headers, body: req.body, outcome: 'Processing...' };
        recentPayloads.unshift(currentLog);
        if (recentPayloads.length > 20) recentPayloads.pop();
    }
    const updateOutcome = (text) => { if (currentLog) currentLog.outcome = text; };

    // GET: status & debug endpoint
    if (req.method === 'GET') {
        if (req.query.debug === 'true') {
            return res.status(200).json({ recent_logs: recentPayloads });
        }
        return res.status(200).json({
            status: 'active',
            service: 'WhatsApp Order Integration (Regex Parser)',
            timestamp,
            config_check: {
                supabase: !!process.env.REACT_APP_SUPABASE_URL,
                wasender: !!process.env.WASENDER_API_KEY,
                debug_mode: process.env.DEBUG_MODE === 'true',
                bypass_security: process.env.BYPASS_WHATSAPP_SECURITY === 'true'
            }
        });
    }

    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    try {
        const payload = req.body;
        const signature = req.headers['x-webhook-signature'];
        const webhookSecret = process.env.WASENDER_WEBHOOK_SECRET;
        const bypassSecurity = process.env.BYPASS_WHATSAPP_SECURITY === 'true';
        const softFail = process.env.DEBUG_MODE === 'true';

        // Handle WASender test/verification events
        if (payload.event === 'webhook.verified' || payload.event === 'webhook.test') {
            return res.status(200).json({ status: 'verified', event: payload.event });
        }

        // Signature verification (literal comparison)
        if (webhookSecret && signature && !bypassSecurity) {
            if (signature !== webhookSecret) {
                if (!softFail) {
                    updateOutcome('Signature Mismatch');
                    return res.status(401).json({ message: 'Invalid signature' });
                }
            }
        }

        // Filter to message events only
        const isMessageEvent = payload.event?.includes('received') &&
            (payload.event?.includes('message') || payload.event?.includes('chat'));

        if (!isMessageEvent) {
            updateOutcome(`Ignored Event: ${payload.event}`);
            return res.status(200).json({ status: 'ignored', reason: 'unhandled_event', event: payload.event });
        }

        // Extract message data
        const messageData = payload.data?.messages || payload.data?.message;
        const messageBody = messageData?.messageBody ||
            messageData?.message?.conversation ||
            messageData?.message?.extendedTextMessage?.text ||
            messageData?.message?.imageMessage?.caption ||
            messageData?.body || '';

        const remoteJid = messageData?.key?.remoteJid || '';
        const phone = remoteJid.split('@')[0];
        const pushName = messageData?.pushName || 'WhatsApp Customer';

        if (!messageBody || !phone) {
            updateOutcome('Empty body or phone');
            return res.status(200).json({ status: 'ignored', reason: 'invalid data' });
        }

        console.log(`💬 WhatsApp from ${phone} (${pushName}): ${messageBody}`);
        updateOutcome('Parsing message...');

        // --- REGEX PARSING ---
        const parsed = parseOrderFromMessage(messageBody);

        if (!parsed) {
            updateOutcome('Not an order (no order keywords found)');
            return res.status(200).json({ status: 'ignored', reason: 'not_an_order', message: messageBody });
        }

        updateOutcome(`Order found for: ${parsed.customer_name}. Creating...`);
        console.log('📦 Parsed order:', parsed);

        // Generate job number first (used in notes + confirmation)
        const jobNumber = await generateJobNumber(parsed.machine_type, parsed.product_name);

        // Build structured notes in KEY: VALUE format
        // This is what extractOrderInfo() in OrderDetail.tsx reads to show "Print Jobs"
        const structuredNotes = [
            `=== JOB 1: ${parsed.product_name} ===`,
            `MACHINE: ${parsed.machine_type}`,
            `PRODUCT: ${parsed.product_name}`,
            `QUANTITY: ${parsed.quantity}`,
            `SIZE: ${parsed.size}`,
            `COLOR: ${parsed.color_notes || 'Not specified'}`,
            `CUSTOMER: ${parsed.customer_name}`,
            `WHATSAPP: ${phone}`,
            `SOURCE: WhatsApp Order`,
            `RAW: ${messageBody}`
        ].join('\n');

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                customer_name: parsed.customer_name || pushName,
                order_date: new Date().toISOString(),
                required_date: null,
                status: 'pending',
                notes: structuredNotes,
                total_amount: 0,
                job_number: jobNumber
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // --- CONFIRMATION REPLY ---
        const confirmationText = `✅ Order Created!\n\nJob #: ${jobNumber}\nCustomer: ${parsed.customer_name || pushName}\nMachine: ${parsed.machine_type}\nProduct: ${parsed.product_name}\nQty: ${parsed.quantity}\nColor: ${parsed.color_notes || 'N/A'}\nStatus: Pending\n\nThank you for choosing Apple Graphics! 🖨️`;
        await sendWhatsAppReply(phone, confirmationText);

        updateOutcome(`✅ Order Created: ${jobNumber}`);
        return res.status(201).json({ status: 'success', job_number: jobNumber, parsed });

    } catch (err) {
        console.error('❌ Webhook error:', err);
        updateOutcome(`Error: ${err.message}`);
        return res.status(500).json({ error: err.message });
    }
}
