
// Updated robust function from OrderDetail.tsx
const extractOrderInfo = (notes) => {
    if (!notes) return { jobs: [] };

    // Check for Multi-Job Format - Robust check for either header OR job blocks
    const jobHeaderRegex = /=== JOB \d+: .+ ===/;
    const hasMultiJobHeader = notes.includes('=== MULTI-JOB ORDER ===');
    const hasJobBlocks = jobHeaderRegex.test(notes);

    if (hasMultiJobHeader || hasJobBlocks) {
        console.log("Detected Multi-Job Order (Robust Check)");
        const jobs = [];

        // Split by job headers
        const splitRegex = /(?==== JOB \d+: .+ ===)/;
        const rawBlocks = notes.split(splitRegex);

        // Filter out blocks that don't look like jobs
        const jobBlocks = rawBlocks.filter(b => jobHeaderRegex.test(b));
        const jobHeaders = notes.match(/=== JOB \d+: (.+) ===/g) || [];

        jobBlocks.forEach((block, index) => {
            const lines = block.trim().split('\n');
            // Fix header extraction index logic for missing header case
            // Actually with regex matching headers, the order should match the blocks if blocks are filtered correctly

            const headerMatch = block.match(/=== JOB \d+: (.+) ===/);
            const title = headerMatch ? headerMatch[1] : `Job ${index + 1}`;

            const info = {
                jobTitle: title
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
const testNotes3 = `=== JOB 1: Failed Header ===
Machine: Konica
Product: Failed Header
Quantity: 5`;

console.log("\n--- Test Case 3 (Missing Header - Should now be Multi-Job) ---");
console.log(JSON.stringify(extractOrderInfo(testNotes3), null, 2));
