
// Mock function from OrderDetail.tsx
const extractOrderInfo = (notes) => {
    if (!notes) return { jobs: [] };

    // Check for Multi-Job Format
    if (notes.includes('=== MULTI-JOB ORDER ===')) {
        console.log("Detected Multi-Job Order");
        const jobs = [];
        const jobBlocks = notes.split(/=== JOB \d+: .+ ===/).slice(1);
        const jobHeaders = notes.match(/=== JOB \d+: (.+) ===/g) || [];

        jobBlocks.forEach((block, index) => {
            const lines = block.trim().split('\n');
            const info = {
                jobTitle: jobHeaders[index] ? jobHeaders[index].replace(/=== JOB \d+: | ===/g, '') : `Job ${index + 1}`
            };

            lines.forEach(line => {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    info[key.trim().toUpperCase()] = valueParts.join(':').trim();
                }
            });
            jobs.push(info);
        });

        return { jobs, isMultiJob: true };
    }

    console.log("Detected Legacy/Single Order");
    // Legacy Single Job Format
    const info = {};
    const lines = notes.split('\n');
    lines.forEach(line => {
        if (line.startsWith('===') || !line.includes(':')) return;
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            info[key.trim().toUpperCase()] = valueParts.join(':').trim();
        }
    });

    return { jobs: [info], isMultiJob: false };
};

// Test Cases
const testNotes1 = `=== MULTI-JOB ORDER ===

=== JOB 1: Test Product ===
Machine: Konica
Product: Test Product
Quantity: 100

=== JOB 2: Another Product ===
Machine: Riso
Product: Another Product
Quantity: 500

=== NOTES ===
Some notes`;

const testNotes2 = `=== PRINT SPECIFICATIONS ===
Machine: Konica
Product: Single Job
Quantity: 10
=== NOTES ===
Legacy notes`;

const testNotes3 = `=== JOB 1: Failed Header ===
Machine: Konica
Product: Failed Header
Quantity: 5`;
// This one is MISSING the top level header, simulating a bad save

console.log("--- Test Case 1 (Standard Multi) ---");
console.log(JSON.stringify(extractOrderInfo(testNotes1), null, 2));

console.log("\n--- Test Case 2 (Legacy Single) ---");
console.log(JSON.stringify(extractOrderInfo(testNotes2), null, 2));

console.log("\n--- Test Case 3 (Missing Header) ---");
console.log(JSON.stringify(extractOrderInfo(testNotes3), null, 2));
