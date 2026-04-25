import { Metadata } from 'next';
import { Suspense } from 'react';
import { getApplications, type ApplicationStatus } from '@/lib/queries/applications';
import ApplicationsPageContent from '@/components/admin/applications/ApplicationsPageContent';
import ApplicationsLoading from './loading';

export const metadata: Metadata = {
  title: 'Applications Management | Scamurai Admin',
};

interface PageProps {
  params: Promise<{ locale: string; adminSlug: string }>;
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    sort?: string;
  }>;
}

export default async function AdminApplicationsPage({ params, searchParams }: PageProps) {
  // We don't await data here, we pass the promises down or await them in a Suspense child
  return (
    <Suspense fallback={<ApplicationsLoading />}>
      <ApplicationsDataWrapper params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ApplicationsDataWrapper({ params, searchParams }: PageProps) {
  const [{ locale, adminSlug }, sParams] = await Promise.all([params, searchParams]);

  const status = (sParams.status as ApplicationStatus) || 'all';
  const search = sParams.q || '';
  const page = parseInt(sParams.page || '1', 10);
  const sort = (sParams.sort as 'newest' | 'oldest') || 'newest';
  const pageSize = 20;

  // 2. Fetch data
  const { rows, total, counts } = await getApplications({
    status,
    search,
    page,
    pageSize,
    sort,
  });

  return (
    <ApplicationsPageContent
      applications={rows}
      total={total}
      counts={counts}
      status={status}
      search={search}
      sort={sort}
      page={page}
      pageSize={pageSize}
    />
  );
}
