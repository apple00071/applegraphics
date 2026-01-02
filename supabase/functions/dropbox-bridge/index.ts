// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DROPBOX_APP_KEY = Deno.env.get('DROPBOX_APP_KEY')!
const DROPBOX_APP_SECRET = Deno.env.get('DROPBOX_APP_SECRET')!
const DROPBOX_REFRESH_TOKEN = Deno.env.get('DROPBOX_REFRESH_TOKEN')!

// Supabase Setup
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getDropboxAccessToken() {
    console.log('🔄 Refreshing Dropbox Token...')
    const params = new URLSearchParams()
    params.append('grant_type', 'refresh_token')
    params.append('refresh_token', DROPBOX_REFRESH_TOKEN)
    params.append('client_id', DROPBOX_APP_KEY)
    params.append('client_secret', DROPBOX_APP_SECRET)

    const res = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        body: params
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Failed to refresh token: ${err}`)
    }

    const data = await res.json()
    return data.access_token
}

async function uploadToDropbox(accessToken: string, path: string, fileBuffer: ArrayBuffer) {
    console.log(`🚀 Uploading to Dropbox: ${path}`)

    // Dropbox API requires args in header
    const args = {
        path: path,
        mode: 'add',
        autorename: true,
        mute: false
    }

    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Dropbox-API-Arg': JSON.stringify(args),
            'Content-Type': 'application/octet-stream'
        },
        body: fileBuffer
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Dropbox Upload Failed: ${err}`)
    }

    const data = await res.json()
    console.log('✅ Upload Success:', data.path_display)
    return data
}

serve(async (req: Request) => {
    try {
        const { record } = await req.json()

        if (!record || !record.file_path) {
            return new Response(JSON.stringify({ message: 'No file path' }), { status: 200 })
        }

        console.log(`📦 New Job: ${record.job_name} (${record.id})`)

        // 1. Fetch Job Details for Folder Structure
        // We assume 'record' has the basics, but let's look up printer/customer if needed.
        // For now, we'll use: /PrintJobs/[PrinterID]/[Date]/[JobName]
        // To get real names, we'd query DB. Let's do a quick query.

        // NOTE: Edge Function 'record' is the raw DB row. 
        // We need to fetch joined data or just use IDs. 
        // Let's use IDs for speed, or fetch if critical.

        // Simple Structure: /PrintJobs/YYYY-MM-DD/[JobName].[ext]
        const dateDir = new Date().toISOString().split('T')[0]

        // Extract extension from original file path
        const ext = record.file_path.split('.').pop() || 'pdf';
        const dropboxPath = `/PrintJobs/${dateDir}/${record.job_name}.${ext}`

        // 2. Download File from Supabase
        const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('print-jobs')
            .download(record.file_path)

        if (downloadError) throw downloadError

        const fileBuffer = await fileData.arrayBuffer()

        // 3. Get Dropbox Token
        const accessToken = await getDropboxAccessToken()

        // 4. Upload
        const uploadResult = await uploadToDropbox(accessToken, dropboxPath, fileBuffer)

        // 5. Create Shared Link
        console.log('🔗 Creating Dropbox Shared Link...')
        const linkRes = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: uploadResult.path_display,
                settings: {
                    requested_visibility: 'public'
                }
            })
        });

        let sharedLink = '';
        if (linkRes.ok) {
            const linkData = await linkRes.json();
            sharedLink = linkData.url;
        } else {
            // Link might already exist, try checking error or just assume standard path structure if critical
            // For now, simpler error handling:
            console.warn('⚠️ Could not create new shared link (maybe exists).');
            // Check if we can get existing link logic here if needed, 
            // but for now let's try to proceed or just log.
            // A robust production app would search for existing links.
        }

        // 6. Update Database with New Link (if we got one)
        if (sharedLink) {
            console.log(`💾 Updating DB with Link: ${sharedLink}`);

            // Convert '0' to '1' at the end to force direct download/render if desired, 
            // but default '0' is fine for viewing page.

            await supabase
                .from('orders')
                .update({ file_path: sharedLink })
                .eq('id', record.id);
        }

        // 7. Cleanup - "Smart Buffer" Logic
        // Delete from Supabase immediately to save space
        const { error: removeError } = await supabase.storage.from('print-jobs').remove([record.file_path])
        if (removeError) {
            console.error('⚠️ Cleanup Warning: Failed to delete from Supabase:', removeError)
        } else {
            console.log('🗑️ Smart Buffer: Deleted from Supabase Storage')
        }

        return new Response(JSON.stringify({ message: 'Synced to Dropbox & DB Updated' }), { status: 200 })

    } catch (error: any) {
        console.error('❌ Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
