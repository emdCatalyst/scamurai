import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  // Handle the event
  const { id: clerkUserId } = evt.data;
  const eventType = evt.type;

  if (eventType === 'user.created') {
    // Only brand-admin invitation acceptances need server-side linking — every
    // other user (finance/staff created by `createBrandUser`) is created via
    // `client.users.createUser()` which already sets `clerk_user_id` on the
    // DB row in the same action. Brand-admin invites pre-set `publicMetadata.role`
    // on the invitation (see `approveApplication.ts`), so it's reliably present
    // on the user.created event for that flow only.
    const role = (evt.data.public_metadata as { role?: string } | undefined)?.role;
    if (role !== 'brand_admin') {
      console.log(
        `[webhook] user.created skipped — not a brand admin invitation (role=${role ?? 'unset'})`
      );
      return new Response('', { status: 200 });
    }

    const primaryEmail = evt.data.email_addresses[0]?.email_address;

    if (!primaryEmail) {
      console.error('No email found in Clerk user.created event');
      return new Response('No email found', { status: 200 });
    }

    try {
      // Find the user row where email matches and clerk_user_id is not yet set
      const result = await db
        .update(users)
        .set({
          clerkUserId: clerkUserId as string,
          joinedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(users.email, primaryEmail.toLowerCase()),
            isNull(users.clerkUserId)
          )
        );

      console.log(`Clerk user.created linked for email: ${primaryEmail}`);
    } catch (err) {
      console.error('Error updating user with clerk_user_id:', err);
      // Return 200 to Clerk so it doesn't keep retrying if it's a transient DB error
      // or log properly for manual intervention.
    }
  }

  return new Response('', { status: 200 });
}
