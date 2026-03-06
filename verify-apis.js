import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
    console.log('--- API Verification Test ---');

    // 1. Test Login
    console.log('\n1. Testing Login...');
    const loginPayload = {
        email: 'pavan@applegraphics.in',
        password: 'Sulochana1026!'
    };

    try {
        const loginRes = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginPayload)
        });

        const loginData = await loginRes.json();

        if (loginRes.ok) {
            console.log('✅ Login successful!');
            const token = loginData.token;

            // 2. Test Materials with Token
            console.log('\n2. Testing Materials list with token...');
            const matRes = await fetch(`${API_BASE}/materials`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const matData = await matRes.json();
            if (matRes.ok) {
                console.log(`✅ Materials fetched successfully! Count: ${Array.isArray(matData) ? matData.length : 'N/A'}`);
            } else {
                console.error('❌ Materials fetch failed:', matData);
            }
        } else {
            console.error('❌ Login failed:', loginData);
        }
    } catch (err) {
        console.error('❌ Connectivity error:', err.message);
        console.log('Note: Ensure "npm start" is running on localhost:3000');
    }
}

testAPI();
