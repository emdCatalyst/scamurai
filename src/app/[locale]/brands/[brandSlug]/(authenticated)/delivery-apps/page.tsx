import { requireAuth } from "@/lib/auth";
import { getActiveCatalogApps, getEnabledAppIdsForBrand } from "@/lib/queries/deliveryAppCatalog";
import { getBrandBySlug } from "@/lib/queries/brands";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DeliveryAppsGrid } from "@/components/brand/delivery-apps/DeliveryAppsGrid";

export default async function DeliveryAppsPage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;
  const { brandId: userBrandId } = await requireAuth(["brand_admin"]);
  const brand = await getBrandBySlug(brandSlug);
  const t = await getTranslations("brand.deliveryApps");

  if (!brand) {
    notFound();
  }

  // Security check: ensure user belongs to this brand
  if (userBrandId !== brand.id) {
    redirect("/");
  }

  // Parallel fetch for catalog and enabled status
  const [catalogApps, enabledAppIds] = await Promise.all([
    getActiveCatalogApps(),
    getEnabledAppIdsForBrand(brand.id),
  ]);

  return (
    <div className="animate-in fade-in duration-700">
      <DeliveryAppsGrid 
        catalogApps={catalogApps} 
        enabledAppIds={enabledAppIds} 
      />
    </div>
  );
}
