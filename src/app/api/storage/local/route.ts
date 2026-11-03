import { NextResponse } from 'next/server';
import { getLocalDriver, storageDriver } from '@/lib/storage';

/**
 * Development-only stand-in for Cloud Storage signed URLs (local driver).
 * Every request carries a signed, expiring token for exactly one object and
 * one operation, so it needs no session (like a real signed URL).
 * Returns 404 unless the local driver is active outside production.
 */

function localDriverOrNull() {
  if (process.env.NODE_ENV === 'production' || storageDriver() !== 'local') return null;
  return getLocalDriver();
}

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });
const forbidden = () => NextResponse.json({ error: 'Invalid or expired upload URL' }, { status: 403 });

export async function PUT(request: Request) {
  const driver = localDriverOrNull();
  if (!driver) return notFound();

  const payload = driver.verifyToken(new URL(request.url).searchParams.get('token') ?? '', 'put');
  if (!payload) return forbidden();
  if (payload.ct && request.headers.get('content-type') !== payload.ct) {
    return NextResponse.json({ error: 'Content-Type does not match the signed upload' }, { status: 400 });
  }

  const body = new Uint8Array(await request.arrayBuffer());
  if (payload.max !== undefined && body.byteLength > payload.max) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 });
  }

  await driver.write(payload, body);
  return new NextResponse(null, { status: 200 });
}

export async function GET(request: Request) {
  const driver = localDriverOrNull();
  if (!driver) return notFound();

  const payload = driver.verifyToken(new URL(request.url).searchParams.get('token') ?? '', 'get');
  if (!payload) return forbidden();

  const object = await driver.get(payload.b, payload.k);
  if (!object) return notFound();

  return new NextResponse(Buffer.from(object.body), {
    headers: {
      'Content-Type': object.contentType,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
