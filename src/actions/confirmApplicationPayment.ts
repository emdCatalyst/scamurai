'use server';

import { z } from '@/lib/zod';
import { db } from '@/lib/db';
import { applications } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth';
import { whereTransitionAllowed } from '@/lib/queries/applications';
import { paymentReferenceSchema } from '@/components/admin/applications/reviewRules';

/**
 * Records that a quoted application has been paid (quoted → paid): who
 * confirmed it, when, and the bank transfer or invoice reference. Applies only
 * while the application is still `quoted` (optimistic concurrency).
 */

const inputSchema = z.object({
  id: z.uuid(),
  paymentReference: paymentReferenceSchema,
});

export type ConfirmApplicationPaymentInput = z.input<typeof inputSchema>;

export type ConfirmApplicationPaymentError = 'invalidInput' | 'invalidPaymentReference' | 'conflict' | 'failed';

export type ConfirmApplicationPaymentResult =
  | { success: true }
  | { success: false; error: ConfirmApplicationPaymentError };

export async function confirmApplicationPayment(
  input: ConfirmApplicationPaymentInput
): Promise<ConfirmApplicationPaymentResult> {
  const { userId } = await requireAuth(['master_admin']);

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const referenceIssue = parsed.error.issues.some((issue) => issue.path[0] === 'paymentReference');
    return { success: false, error: referenceIssue ? 'invalidPaymentReference' : 'invalidInput' };
  }

  const { id, paymentReference } = parsed.data;
  const now = new Date();

  try {
    const [updated] = await db
      .update(applications)
      .set({
        status: 'paid',
        paidAt: now,
        paymentReference,
        paymentConfirmedBy: userId,
        updatedAt: now,
      })
      .where(whereTransitionAllowed(id, 'quoted', 'paid'))
      .returning({ id: applications.id });

    return updated ? { success: true } : { success: false, error: 'conflict' };
  } catch (error) {
    console.error(`[confirmApplicationPayment] Failed to confirm payment for ${id}:`, error);
    return { success: false, error: 'failed' };
  }
}
