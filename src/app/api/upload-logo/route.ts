import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { brandLogoKey } from '@/lib/storage/keys';
import { storeLogo } from '@/lib/storage/logoUpload';

/**
 * Brand logo upload (onboarding and brand settings). Brand admins only. The
 * file is stored under a new content-addressed key, so an upload can never
 * overwrite the logo in use; it only takes effect when the admin saves the
 * returned /media path through completeBrandSetup or updateBrandIdentity.
 */
export async function POST(request: Request) {
  const { brandId } = await requireAuth(['brand_admin']);
  if (!brandId) {
    return NextResponse.json({ error: 'No brand associated' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const result = await storeLogo(file instanceof File ? file : null, (hash, ext) => brandLogoKey(brandId, hash, ext));
    return result.ok
      ? NextResponse.json({ url: result.url })
      : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) {
    console.error('[upload-logo] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
