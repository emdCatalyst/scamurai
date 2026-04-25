import { db } from '@/lib/db';
import { applications } from '@/lib/db/schema';
import { eq, or, ilike, desc, asc, sql, and, count } from 'drizzle-orm';

export type ApplicationStatus = 'pending' | 'quoted' | 'approved' | 'rejected' | 'all';

export interface GetApplicationsParams {
  status?: ApplicationStatus;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: 'newest' | 'oldest';
}

export async function getApplications({
  status = 'all',
  search,
  page = 1,
  pageSize = 20,
  sort = 'newest',
}: GetApplicationsParams) {
  const offset = (page - 1) * pageSize;

  const whereConditions = [];

  if (status !== 'all') {
    whereConditions.push(eq(applications.status, status));
  }

  if (search) {
    whereConditions.push(
      or(
        ilike(applications.brandName, `%${search}%`),
        ilike(applications.contactEmail, `%${search}%`)
      )
    );
  }

  const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Run queries in parallel
  const [rows, totalResult, countsResult] = await Promise.all([
    db
      .select()
      .from(applications)
      .where(where)
      .orderBy(sort === 'newest' ? desc(applications.createdAt) : asc(applications.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(applications)
      .where(where),
    db
      .select({ 
        status: applications.status, 
        count: count() 
      })
      .from(applications)
      .groupBy(applications.status)
  ]);

  const total = Number(totalResult[0]?.count || 0);
  
  // Format counts as a record
  const counts: Record<string, number> = {
    all: 0,
    pending: 0,
    quoted: 0,
    approved: 0,
    rejected: 0,
  };

  let allCount = 0;
  countsResult.forEach((item) => {
    const countVal = Number(item.count);
    counts[item.status] = countVal;
    allCount += countVal;
  });
  counts.all = allCount;

  return {
    rows,
    total,
    counts,
  };
}
