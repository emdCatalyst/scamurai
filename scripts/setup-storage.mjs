// Creates the Supabase Storage buckets the app expects. Idempotent: existing
// buckets are left as they are, with a warning if their visibility differs.
//
// Usage (reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local):
//   node scripts/setup-storage.mjs
//
// Buckets
//   brand-assets  public   brand + delivery-app logos (served with getPublicUrl)
//   order-images  private  sealed/opened order photos (served via short-lived signed URLs)
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const BUCKETS = [
  {
    name: 'brand-assets',
    options: {
      public: true,
      fileSizeLimit: '2MB',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
    },
  },
  {
    name: 'order-images',
    options: {
      public: false,
      fileSizeLimit: '5MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: existing, error: listError } = await supabase.storage.listBuckets();
if (listError) {
  console.error('Could not list buckets:', listError.message);
  process.exit(1);
}

let failed = false;
for (const { name, options } of BUCKETS) {
  const current = existing.find((bucket) => bucket.name === name);
  if (current) {
    const note = current.public === options.public ? '' : ` (WARNING: public=${current.public}, expected ${options.public})`;
    console.log(`= ${name} already exists${note}`);
    continue;
  }
  const { error } = await supabase.storage.createBucket(name, options);
  if (error) {
    failed = true;
    console.error(`✗ ${name}: ${error.message}`);
  } else {
    console.log(`+ ${name} created (${options.public ? 'public' : 'private'})`);
  }
}

process.exit(failed ? 1 : 0);
