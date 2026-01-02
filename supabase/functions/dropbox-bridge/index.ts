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

        // 0. Recursion Guard
        if (record.file_path.startsWith('http')) {
            console.log('⏩ Skipping: File path is already a URL.')
            return new Response(JSON.stringify({ message: 'Already processed' }), { status: 200 })
        }


        console.log(`📦 New Job: ${record.job_number} (${record.id})`)

        // Path Logic
        const dateDir = new Date().toISOString().split('T')[0]
        const ext = record.file_path.split('.').pop() || 'pdf';

        // Use job_number for the filename (or fallback to id if missing)
        const fileName = record.job_number || record.id || 'unknown_job';
        const dropboxPath = `/PrintJobs/${dateDir}/${fileName}.${ext}`

        // 1. Download File from Supabase
        const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('print-jobs')
            .download(record.file_path)

        if (downloadError) {
            console.error('❌ Download Failed:', downloadError)
            // If file is gone, we can't do anything. Maybe it was already processed?
            return new Response(JSON.stringify({ error: 'File not found in storage' }), { status: 404 })
        }

        const fileBuffer = await fileData.arrayBuffer()

        // 2. Get Token & Upload
        const accessToken = await getDropboxAccessToken()
        const uploadResult = await uploadToDropbox(accessToken, dropboxPath, fileBuffer)

        // 3. Get Dropbox Shared Link
        let sharedLink = '';
        console.log('🔗 Creating Dropbox Shared Link...')

        const linkRes = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: uploadResult.path_display })
        });

        if (linkRes.ok) {
            const linkData = await linkRes.json();
            sharedLink = linkData.url;
        } else {
            console.warn('⚠️ Create Link Failed. Trying to list existing links...');
            // Fallback: List links
            const listRes = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: uploadResult.path_display })
            });

            if (listRes.ok) {
                const listData = await listRes.json();
                if (listData.links && listData.links.length > 0) {
                    sharedLink = listData.links[0].url;
                    console.log('✅ Found existing link:', sharedLink);
                }
            }
        }

        if (!sharedLink) {
            throw new Error('FAILED to get a valid Dropbox Link. Aborting cleanup to protect file.')
        }

        // 4. Update Database
        console.log(`💾 Updating DB with Link: ${sharedLink}`);
        const { error: updateError } = await supabase
            .from('orders')
            .update({ file_path: sharedLink })
            .eq('id', record.id);

        if (updateError) {
            throw new Error(`DB Update Failed: ${updateError.message}. Aborting cleanup.`)
        }

        // 5. Cleanup (ONLY reachable if DB Update succeeded)
        console.log('🗑️ DB Updated. Deleting from Supabase Storage...');
        const { error: removeError } = await supabase.storage.from('print-jobs').remove([record.file_path])

        if (removeError) {
            console.error('⚠️ Cleanup Warning:', removeError)
        } else {
            console.log('✅ Smart Buffer Complete: File moved to Dropbox & DB Updated.')
        }

        return new Response(JSON.stringify({ message: 'Success: Uploaded, Linked, Updated, & Cleaned' }), { status: 200 })

    } catch (error: any) {
        console.error('❌ Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
