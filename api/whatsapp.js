import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.REACT_APP_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// Using -latest alias often resolves 404s in v1beta/v1 transitions
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

// Helper to generate job number (mirrors AddOrder.tsx logic)
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
            const lastJobNumber = orders[0].job_number;
            const sequencePart = lastJobNumber.substring(prefix.length);
            const lastSequence = parseInt(sequencePart, 10);
            if (!isNaN(lastSequence)) {
                nextSequence = lastSequence + 1;
            }
        }
        return `${prefix}${nextSequence.toString().padStart(2, '0')}`;
    } catch (error) {
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
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to, text })
        });
    } catch (err) {
        console.error('❌ Failed to send WhatsApp reply:', err);
    }
}

// Global for debugging (Vercel may persist briefly between warm calls)
let recentPayloads = [];

export default async function handler(req, res) {
    const timestamp = new Date().toISOString();

    // 1. Global logging for EVERY request
    console.log(`🌐 [${timestamp}] Webhook: ${req.method} ${req.url}`);

    let currentLog = null;
    if (req.method === 'POST') {
        currentLog = {
            timestamp,
            headers: req.headers,
            body: req.body,
            outcome: 'Processing...'
        };
        recentPayloads.unshift(currentLog);
        if (recentPayloads.length > 20) recentPayloads.pop();
    }

    // Helper to update log outcome
    const updateOutcome = (text) => {
        if (currentLog) currentLog.outcome = text;
    };

    // 2. GET handler for status and logs
    if (req.method === 'GET') {
        if (req.query.debug === 'true') {
            return res.status(200).json({
                recent_logs: recentPayloads
            });
        }
        return res.status(200).json({
            status: 'active',
            service: 'WhatsApp Order Integration',
            timestamp,
            config_check: {
                supabase: !!process.env.REACT_APP_SUPABASE_URL,
                gemini: !!process.env.GEMINI_API_KEY,
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
        const softFail = process.env.DEBUG_MODE === 'true'; // Set this to 'true' in hosting panel to test

        console.log('--- Webhook Security Check ---');
        console.log(`- Webhook Secret Present: ${!!webhookSecret}`);
        console.log(`- Bypass Active: ${bypassSecurity}`);
        console.log(`- Soft Fail Active: ${softFail}`);

        // Handlers for specific WASender registration/test events
        if (payload.event === 'webhook.verified' || payload.event === 'webhook.test') {
            console.log(`✅ Webhook verified/test successful: ${payload.event}`);
            return res.status(200).json({ status: 'verified', event: payload.event });
        }

        // Verify signature (WASender uses literal secret comparison)
        if (webhookSecret && signature && !bypassSecurity) {
            if (signature !== webhookSecret) {
                console.warn('⚠️ Webhook signature mismatch (Literal check)');

                if (softFail) {
                    console.warn('🛡️ Soft Fail enabled: Proceeding despite invalid signature.');
                } else {
                    return res.status(401).json({
                        message: 'Invalid signature',
                        hint: 'Signature header did not match WASENDER_WEBHOOK_SECRET exactly.'
                    });
                }
            } else {
                console.log('✅ Signature verified successfully (Literal match)!');
            }
        }

        // Support singular, plural, and personal/group/chat variants
        const isMessageEvent = payload.event?.includes('received') &&
            (payload.event?.includes('message') || payload.event?.includes('chat'));

        if (!isMessageEvent) {
            updateOutcome(`Ignored Event: ${payload.event}`);
            return res.status(200).json({ status: 'ignored', reason: 'unhandled_event', event: payload.event });
        }

        // Support both data.message (singular) and data.messages (plural)
        const messageData = payload.data?.messages || payload.data?.message;

        // Support messageBody (documented plural field) or deeper conversation/text fields
        const messageBody = messageData?.messageBody ||
            messageData?.message?.conversation ||
            messageData?.message?.extendedTextMessage?.text ||
            messageData?.message?.imageMessage?.caption ||
            messageData?.body || "";

        const remoteJid = messageData?.key?.remoteJid || "";
        const phone = remoteJid.split('@')[0];
        const pushName = messageData?.pushName || "WhatsApp Customer";

        if (!messageBody || !phone) {
            updateOutcome('Empty body or phone');
            return res.status(200).json({ status: 'ignored', reason: 'invalid data' });
        }

        console.log(`💬 WhatsApp from ${phone}: ${messageBody}`);
        updateOutcome('Parsing with Gemini...');

        // Check if Gemini API Key is missing
        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY is missing in env');
            return res.status(200).json({ status: 'error', reason: 'config_missing' });
        }

        // --- AI PARSING ---
        const prompt = `
      Extract order details from this WhatsApp message for "Apple Graphics".
      Return ONLY a JSON object.
      
      Message: "${messageBody}"
      
      Required JSON structure:
      {
        "customer_name": "...",
        "machine_type": "...", (One of: Konica, Riso, Flex, Offset, Multicolor)
        "product_name": "...",
        "items": [{ "material_name": "...", "quantity": 1, "notes": "..." }],
        "required_date": "...", (ISO format if possible, otherwise null)
        "is_order": true/false (Set false if just general chat)
      }
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        let parsed;

        try {
            parsed = JSON.parse(responseText.replace(/```json|```/g, '').trim());
        } catch (e) {
            updateOutcome('Gemini Parse Failed');
            return res.status(200).json({ status: 'error', reason: 'parse_failed' });
        }

        if (!parsed.is_order) {
            updateOutcome('Not an order (AI decision)');
            return res.status(200).json({ status: 'ignored', reason: 'not_an_order' });
        }

        updateOutcome(`Order Found: ${parsed.customer_name}. Creating in DB...`);

        // --- DATABASE INSERTION ---

        // 1. Generate Job Number
        const jobNumber = await generateJobNumber(parsed.machine_type, parsed.product_name);

        // 2. Create Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                customer_name: parsed.customer_name || pushName,
                order_date: new Date().toISOString(),
                required_date: parsed.required_date || null,
                status: 'pending',
                notes: `WhatsApp Order [${phone}]: ${messageBody}`,
                total_amount: 0,
                job_number: jobNumber
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // 3. Add Line Items
        if (parsed.items && parsed.items.length > 0) {
            const items = parsed.items.map(item => ({
                order_id: order.id,
                material_id: null, // Natural language won't have material IDs
                quantity: item.quantity || 1,
                unit_price: 0,
                notes: `${item.material_name}: ${item.notes || ''}`
            }));
            await supabase.from('order_items').insert(items);
        }

        // --- CONFIRMATION ---
        const confirmationText = `✅ Order Created Successfully!\n\nOrder #: ${jobNumber}\nCustomer: ${parsed.customer_name || pushName}\nItems: ${parsed.items?.length || 0}\nStatus: Pending\n\nThank you for choosing Apple Graphics!`;
        await sendWhatsAppReply(phone, confirmationText);

        updateOutcome(`✅ Order Created: ${jobNumber}`);
        return res.status(201).json({ status: 'success', job_number: jobNumber });

    } catch (err) {
        console.error('❌ Webhook error:', err);
        updateOutcome(`Error: ${err.message}`);
        return res.status(500).json({ error: err.message });
    }
}
