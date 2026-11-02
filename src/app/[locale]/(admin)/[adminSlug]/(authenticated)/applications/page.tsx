import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getApplications } from '@/lib/queries/applications';
import ApplicationsPageContent from '@/components/admin/applications/ApplicationsPageContent';
import {
  PAGE_SIZE,
  SELECTED_PARAM,
  firstParam,
  parseApplicationListFilters,
  type ListSearchParams,
} from '@/components/admin/applications/listFilters';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.applications');
  return { title: t('metaTitle') };
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const params = await searchParams;
  const filters = parseApplicationListFilters(params);
  const { rows, total, page, counts } = await getApplications(filters, PAGE_SIZE);

  return (
    <ApplicationsPageContent
      applications={rows}
      total={total}
      counts={counts}
      filters={{ ...filters, page }}
      pageSize={PAGE_SIZE}
      initialSelectedId={firstParam(params[SELECTED_PARAM]) ?? null}
    />
  );
}
