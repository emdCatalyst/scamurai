import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { catalogLogoKey } from '@/lib/storage/keys';
import { storeLogo } from '@/lib/storage/logoUpload';

/** Max size for delivery-app catalog logos. */
const CATALOG_LOGO_MAX_BYTES = 1 * 1024 * 1024;

/**
 * Delivery-app logo upload for the platform catalog. Master admins only.
 * Content-addressed like brand logos; takes effect when the admin saves the
 * returned /media path with createCatalogApp or updateCatalogApp.
 */
export async function POST(request: Request) {
  await requireAuth(['master_admin']);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const result = await storeLogo(file instanceof File ? file : null, catalogLogoKey, CATALOG_LOGO_MAX_BYTES);
    return result.ok
      ? NextResponse.json({ url: result.url })
      : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) {
    console.error('[upload-catalog-logo] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
