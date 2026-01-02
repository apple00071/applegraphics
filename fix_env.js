import fs from 'fs';

try {
    // Read as buffer to handle weird encodings
    const buffer = fs.readFileSync('.env');

    // Convert to string and remove null bytes
    let content = buffer.toString('utf8').replace(/\0/g, '');

    // Fix potential line ending issues or weird "V a r" spacing if it was UTF-16
    // But usually removing \0 from UTF-16 LE/BE ASCII text works well enough if it was just 00 padding.

    // Also clean up the double assignment seen at the end
    // Replace the specific duplicate pattern if present
    content = content.replace(/APP_URL=http:\/\/localhost:3000 REACT_APP_SUPABASE_URL=.*/, 'APP_URL=http://localhost:3000');

    // ensure final newline
    if (!content.endsWith('\n')) content += '\n';

    console.log('Original length:', buffer.length);
    console.log('New length:', content.length);

    fs.writeFileSync('.env', content, 'utf8');
    console.log('✅ .env fixed and saved as UTF-8');

} catch (e) {
    console.error('Error fixing .env:', e);
}
