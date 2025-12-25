import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xbnvtpzdrnxxqyuygwnp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');

    // Read the SQL file
    const sqlFilePath = join(__dirname, 'supabase-schema.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf-8');

    console.log('📄 SQL Schema loaded from supabase-schema.sql');
    console.log('');
    console.log('⚠️  IMPORTANT: You need to run this SQL manually in Supabase SQL Editor');
    console.log('');
    console.log('Instructions:');
    console.log('1. Go to https://supabase.com/dashboard/project/xbnvtpzdrnxxqyuygwnp/sql/new');
    console.log('2. Copy the contents of supabase-schema.sql');
    console.log('3. Paste into the SQL Editor');
    console.log('4. Click "Run" to execute the migrations');
    console.log('');
    console.log('Or copy this SQL directly:');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    console.log('');

    // Alternative: Try to execute via RPC if possible
    console.log('✅ Schema file is ready. Please run it in Supabase SQL Editor.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
