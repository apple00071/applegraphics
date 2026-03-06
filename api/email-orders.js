import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.REACT_APP_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// Shared order parser — handles both WhatsApp short format and email subjects
function parseOrderFromText(text) {
    const lower = text.toLowerCase();

    // Print industry keywords — emails often use product names without 'qty'/'order'
    const PRINT_PRODUCTS = ['cards', 'stickers', 'flyers', 'posters', 'boards', 'board',
        'banner', 'banners', 'pamphlet', 'brochure', 'invoice', 'bill', 'letterhead',
        'envelope', 'notepad', 'calendar', 'visiting', 'business card', 'flex', 'work'];

    const hasKeyword = lower.includes('order') || lower.includes('print') ||
        lower.includes('qty') || lower.includes('quantity') || lower.includes('copies');
    const hasSizePattern = /\b(A[2-6]|[0-9]+\s*x\s*[0-9]+)\b/i.test(text);
    const hasMachineType = /\b(konica|riso|flex|offset|multicolor)\b/i.test(text);
    const hasPrintProduct = PRINT_PRODUCTS.some(p => lower.includes(p));
    // Match numbers including comma-formatted like 1,000 or 2,500
    const hasNumber = /\b\d[\d,]*\b/.test(text);

    const isOrder = hasKeyword || (hasSizePattern && hasNumber) ||
        (hasMachineType && hasNumber) || (hasPrintProduct && hasNumber);
    if (!isOrder) return null;

    // Customer name: "for <Name>" or first word
    const nameMatch = text.match(/(?:for|customer[:\s]+)\s+([A-Za-z]+)/i);
    const firstWordMatch = text.match(/^([A-Za-z]+)/);
    const customer_name = nameMatch ? nameMatch[1].trim()
        : (firstWordMatch ? firstWordMatch[1].trim() : null);

    // Machine type
    const machineMap = { konica: 'Konica', riso: 'Riso', flex: 'Flex', offset: 'Offset', multicolor: 'Multicolor' };
    const machine_type = Object.entries(machineMap).find(([k]) => lower.includes(k))?.[1] || 'Unknown';

    // Quantity — support comma-formatted (1,000) and product-suffix (1,000 cards)
    const cleanText = text.replace(/,(?=\d{3})/g, ''); // normalize 1,000 → 1000
    const qtyMatch = cleanText.match(/(\d+)\s*(?:qty|copies|pcs|sheets?|cards?|stickers?|flyers?|posters?|boards?|banners?|pieces?)/i) ||
        cleanText.match(/(?:qty|copies|pcs)[:\s]+(\d+)/i) ||
        cleanText.match(/(\d{3,})/); // fallback: any 3+ digit number
    const quantity = qtyMatch ? parseInt(qtyMatch[1].replace(/,/g, ''), 10) : 1;

    // Size
    const sizeMatch = text.match(/\b(A[2-6]|[0-9]+\s*x\s*[0-9]+\s*(?:cm|mm|inch|inches)?)\b/i);
    const size = sizeMatch ? sizeMatch[1].toUpperCase() : 'Standard';

    // Product name — use detected print product type or size
    const detectedProduct = PRINT_PRODUCTS.find(p => lower.includes(p));
    const product_name = detectedProduct
        ? detectedProduct.charAt(0).toUpperCase() + detectedProduct.slice(1)
        : `${size} Print`;

    // Color
    const colorMatch = text.match(/(?:B&B|B&W|black\s*(?:and|&)\s*white|colou?r|blue|red|green|yellow|gold|silver|full\s*colou?r)[^\r\n]*/i);
    const color_notes = colorMatch ? colorMatch[0].trim() : '';

    return { customer_name, machine_type, product_name, size, quantity, color_notes, is_order: true };
}

// Generate job number
async function generateJobNumber(machineType, productName) {
    const machineCode = (machineType === 'Unknown' ? 'U' : machineType).charAt(0).toUpperCase();
    const productCode = (productName || 'P').charAt(0).toUpperCase();
    const prefix = `AG${machineCode}${productCode}`;
    try {
        const { data: orders } = await supabase
            .from('orders')
            .select('job_number')
            .ilike('job_number', `${prefix}%`)
            .order('job_number', { ascending: false })
            .limit(1);
        const lastNumber = orders?.[0]?.job_number?.replace(prefix, '') || '00';
        const nextSequence = parseInt(lastNumber, 10) + 1;
        return `${prefix}${nextSequence.toString().padStart(2, '0')}`;
    } catch {
        return `${prefix}${Date.now().toString().slice(-4)}`;
    }
}

// Deduplication cache
const processedEmailIds = new Map();
const DEDUP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Simple secret check — Apps Script will send this header
    const secret = req.headers['x-email-secret'] || req.body?.secret;
    if (secret !== process.env.EMAIL_WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { emailId, from, subject, body, date } = req.body || {};
    if (!emailId || !from) {
        return res.status(400).json({ error: 'Missing emailId or from fields' });
    }

    // Deduplication
    const now = Date.now();
    for (const [id, ts] of processedEmailIds.entries()) {
        if (now - ts > DEDUP_TTL_MS) processedEmailIds.delete(id);
    }
    if (processedEmailIds.has(emailId)) {
        return res.status(200).json({ status: 'ignored', reason: 'duplicate' });
    }
    processedEmailIds.set(emailId, now);

    // Parse: try subject first, then body
    const textToParse = subject || '';
    const parsed = parseOrderFromText(textToParse) || (body ? parseOrderFromText(body) : null);

    if (!parsed) {
        return res.status(200).json({ status: 'ignored', reason: 'not_an_order', subject, from });
    }

    // Override customer name with email sender name if not parsed
    if (!parsed.customer_name) {
        // Extract name from "Name Surname <email@gmail.com>"
        const senderName = from.match(/^([^<]+)/)?.[1]?.trim();
        parsed.customer_name = senderName || 'Email Customer';
    }

    try {
        const jobNumber = await generateJobNumber(parsed.machine_type, parsed.product_name);

        const structuredNotes = [
            `=== JOB 1: ${parsed.product_name} ===`,
            `MACHINE: ${parsed.machine_type}`,
            `PRODUCT: ${parsed.product_name}`,
            `QUANTITY: ${parsed.quantity}`,
            `SIZE: ${parsed.size}`,
            `COLOR: ${parsed.color_notes || 'Not specified'}`,
            `CUSTOMER: ${parsed.customer_name}`,
            `EMAIL FROM: ${from}`,
            `SOURCE: Email Order`,
            `RAW: ${subject || body || ''}`
        ].join('\n');

        const { error: orderError } = await supabase
            .from('orders')
            .insert([{
                customer_name: parsed.customer_name,
                order_date: date ? new Date(date).toISOString() : new Date().toISOString(),
                required_date: null,
                status: 'pending',
                notes: structuredNotes,
                total_amount: 0,
                job_number: jobNumber
            }]);

        if (orderError) throw orderError;

        console.log(`✅ Email Order Created: ${jobNumber} from ${from}`);
        return res.status(201).json({ status: 'success', job_number: jobNumber, parsed });

    } catch (err) {
        console.error('❌ Email order error:', err);
        return res.status(500).json({ error: err.message });
    }
}
