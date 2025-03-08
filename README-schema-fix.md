# Fixing Database Schema Relationships

If you're seeing the error `Could not find a relationship between 'materials' and 'categories' in the schema cache`, follow these steps to fix it:

## Option 1: Run the Schema Fix Script (Recommended)

This script will check your database schema and add the missing relationships between tables.

### Prerequisites:

1. You need Node.js installed on your computer
2. You need your Supabase Service Role Key (different from the anon key)

### Steps:

1. Add your service role key to your `.env` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

2. Run the script:
   ```
   node fix-schema-relationships.js
   ```

3. The script will:
   - Check if the relationships exist
   - Create any missing relationships
   - Refresh the schema cache

4. Once the script completes successfully, restart your app and the error should be gone.

### Where to Find Your Service Role Key:

1. Go to your Supabase dashboard
2. Click on Settings > API
3. In the "Project API keys" section, copy the "service_role" key
4. ⚠️ **IMPORTANT**: This key has admin privileges. Never expose it in client-side code or commit it to your repository!

## Option 2: Use the Updated MaterialDetail Component

If you can't run the schema fix script (or prefer not to use the service role key), we've also updated the MaterialDetail component to work without needing schema relationships.

The updated component:
- Uses separate, non-blocking queries instead of relationships
- Shows placeholder text while categories and suppliers are loading
- Handles errors gracefully without showing technical messages to users

This option doesn't fix the underlying database issue, but it allows your app to work normally even with the schema issue present.

## Technical Details

The error occurs because Supabase's schema cache doesn't recognize the foreign key relationships between:
- `materials.category_id` → `categories.id`
- `materials.supplier_id` → `suppliers.id`

These relationships are defined in your SQL schema, but they might not be properly implemented in your Supabase instance. The script adds these constraints if they're missing. 