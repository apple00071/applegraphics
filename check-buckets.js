
const supabase = require('./supabaseClient');

async function listBuckets() {
    console.log('Checking Storage Buckets...');
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error listing buckets:', error);
    } else {
        console.log('Buckets:', data);

        // Check if 'print-jobs' exists
        const printBucket = data.find(b => b.name === 'print-jobs');
        if (printBucket) {
            console.log('✅ "print-jobs" bucket exists.');
        } else {
            console.log('❌ "print-jobs" bucket NOT found.');

            // Try creating it
            console.log('Attempting to create "print-jobs" bucket...');
            const { data: newBucket, error: createError } = await supabase.storage.createBucket('print-jobs', {
                public: false
            });

            if (createError) {
                console.error('Failed to create bucket:', createError);
            } else {
                console.log('✅ Created "print-jobs" bucket:', newBucket);
            }
        }
    }
}

listBuckets();
