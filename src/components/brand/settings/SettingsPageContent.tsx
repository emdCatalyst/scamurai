'use client';

import BrandIdentityForm from './BrandIdentityForm';
import AccountForm from './AccountForm';
import PasswordSection from './PasswordSection';
import PlanLimitsPanel from './PlanLimitsPanel';

interface SettingsPageContentProps {
  brandId: string;
  brand: {
    name: string;
    slug: string;
    logoUrl: string | null;
    brandColors: {
      primary: string;
      background: string;
      surface: string;
      textAccent: string;
    } | null;
    plan: string;
  };
  user: {
    fullName: string;
    email: string;
  };
  limits: {
    branchCount: number;
    branchLimit: number;
    userCount: number;
    userLimit: number;
  };
}

export default function SettingsPageContent({
  brandId,
  brand,
  user,
  limits,
}: SettingsPageContentProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-20">

      <div className="grid gap-8">
        {/* Plan & Limits - Important to see first */}
        <PlanLimitsPanel
          plan={brand.plan}
          branchCount={limits.branchCount}
          branchLimit={limits.branchLimit}
          userCount={limits.userCount}
          userLimit={limits.userLimit}
        />

        {/* Brand Identity */}
        <BrandIdentityForm
          brandId={brandId}
          initialData={{
            name: brand.name,
            slug: brand.slug,
            logoUrl: brand.logoUrl,
            brandColors: brand.brandColors,
          }}
        />

        {/* Account Details */}
        <AccountForm
          initialData={{
            fullName: user.fullName,
            email: user.email,
          }}
        />

        {/* Password - Read-only placeholder */}
        <PasswordSection />
      </div>
    </div>
  );
}
