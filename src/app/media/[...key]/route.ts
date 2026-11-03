import { getStorage, IMMUTABLE_CACHE } from '@/lib/storage';
import { isPublicAssetKey } from '@/lib/storage/keys';

/**
 * Public assets (brand and delivery-app logos), served from storage under a
 * stable, provider-independent URL: /media/<key>. Keys are content-addressed
 * (they change when the file changes), so responses are cached forever.
 *
 * Logos may be SVG. The CSP sandbox stops any script inside an SVG from
 * running even if the file is opened directly, since it is served from this
 * origin.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join('/');
  if (!isPublicAssetKey(key)) return new Response('Not found', { status: 404 });

  const object = await getStorage().get('brandAssets', key);
  if (!object) return new Response('Not found', { status: 404 });

  return new Response(Buffer.from(object.body), {
    headers: {
      'Content-Type': object.contentType,
      'Cache-Control': IMMUTABLE_CACHE,
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
