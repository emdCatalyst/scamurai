import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

/**
 * Staff may only be put in a live branch of their own brand (the user and
 * branch actions check it). Uses the seeded demo brand; the deleted branch is
 * created here and removed again.
 */

const { db } = await import('@/lib/db');
const schema = await import('@/lib/db/schema');
const { isLiveBranchOf } = await import('./branches');

describe('isLiveBranchOf', () => {
  it('accepts a live branch of the brand and nothing else', async () => {
    const [brand] = await db.select().from(schema.brands).where(eq(schema.brands.slug, 'demo-burger'));
    if (!brand) throw new Error('Run npm run db:seed first (demo brand missing).');
    const [branch] = await db.select().from(schema.branches).where(eq(schema.branches.brandId, brand.id)).limit(1);

    expect(await isLiveBranchOf(brand.id, branch.id)).toBe(true);
    expect(await isLiveBranchOf(crypto.randomUUID(), branch.id)).toBe(false); // another brand's branch
    expect(await isLiveBranchOf(brand.id, crypto.randomUUID())).toBe(false);

    const [deleted] = await db
      .insert(schema.branches)
      .values({ brandId: brand.id, name: 'Deleted branch (isLiveBranchOf test)', deletedAt: new Date() })
      .returning();
    try {
      expect(await isLiveBranchOf(brand.id, deleted.id)).toBe(false);
    } finally {
      await db.delete(schema.branches).where(eq(schema.branches.id, deleted.id));
    }
  });
});
