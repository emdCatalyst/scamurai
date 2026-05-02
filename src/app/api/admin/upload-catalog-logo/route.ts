import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Check role from session claims (metadata might be missing if template isn't configured)
  let role = sessionClaims?.metadata?.role;
  
  // 2. Fallback to direct API call if metadata is missing from JWT
  if (!role) {
    const user = await currentUser();
    role = user?.publicMetadata?.role as typeof role;
  }

  if (role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const appId = formData.get('appId') as string | undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate size (1MB per spec)
    if (file.size > 1 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 1MB)' }, { status: 400 });
    }

    // Determine extension
    const ext = file.type === 'image/svg+xml' ? 'svg' : file.type === 'image/png' ? 'png' : 'jpg';
    // Use appId if updating, otherwise use timestamp/random for new
    const fileName = appId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const storagePath = `catalog-logos/${fileName}.${ext}`;

    // Convert File to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage (private bucket, but public URL for logos?)
    // doc says "private bucket — images served via signed URLs", but these are catalog logos.
    // The existing upload-logo uses 'brand-assets' and getPublicUrl.
    // I'll stick to 'catalog-logos' bucket. I should ensure it exists or use 'brand-assets'.
    // Tech stack says Supabase Storage is used.
    const { data, error } = await getSupabase().storage
      .from('brand-assets') // Reusing brand-assets bucket for now, or assume catalog-logos exists
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('[upload-catalog-logo] Supabase upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = getSupabase().storage
      .from('brand-assets')
      .getPublicUrl(storagePath);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('[upload-catalog-logo] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
