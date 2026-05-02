'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  MapPin,
  Settings,
  Package,
  LogOut,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

export default function BrandShell({
  children,
  locale,
  brandSlug,
  brandName,
  brandLogo,
  userEmail,
  userAvatar,
  userRole,
}: {
  children: React.ReactNode;
  locale: string;
  brandSlug: string;
  brandName: string;
  brandLogo: string | null;
  userEmail: string;
  userAvatar: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const router = useRouter();
  const t = useTranslations('brand.shell');
  
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('scamurai_brand_sidebar_collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    } else {
      setIsCollapsed(window.innerWidth < 1024);
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('scamurai_brand_sidebar_collapsed', String(newState));
  };

  const baseSegment = `/${locale}/brands/${brandSlug}`;
  let currentPath = '/dashboard';
  
  if (pathname.startsWith(baseSegment)) {
    const relativePath = pathname.substring(baseSegment.length);
    if (relativePath) {
      currentPath = relativePath.split('?')[0]; // Remove query params for matching
    }
  }
  
  const NAV_ITEMS = [
    { id: 'dashboard', icon: LayoutDashboard, href: '/dashboard', active: true, roles: ['brand_admin'] },
    { id: 'orders', icon: ClipboardList, href: '/orders', active: true, roles: ['brand_admin', 'finance'] },
    { id: 'branches', icon: MapPin, href: '/branches', active: true, roles: ['brand_admin'] },
    { id: 'users', icon: Users, href: '/users', active: true, roles: ['brand_admin'] },
    { id: 'delivery-apps', icon: Package, href: '/delivery-apps', active: true, roles: ['brand_admin'] },
    { id: 'settings', icon: Settings, href: '/settings', active: true, roles: ['brand_admin'] },
  ];

  const visibleNavItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));

  const currentNav = visibleNavItems.find(n =>
    currentPath === n.href || currentPath.startsWith(n.href + '/')
  ) || visibleNavItems[0];

  const handleLogout = async () => {
    await signOut();
    router.push(`/${locale}/brands/${brandSlug}/login`);
  };

  const isAr = locale === 'ar';

  return (
    <div 
      className={`flex h-screen w-full bg-[var(--brand-background)] font-sans text-[var(--brand-surface-fg)] overflow-hidden ${isAr ? 'font-arabic' : 'font-sans'}`} 
      dir={isAr ? 'rtl' : 'ltr'}
      suppressHydrationWarning
    >
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-[var(--brand-background)]/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative flex-shrink-0 bg-[var(--brand-background)] shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex flex-col z-50 h-full ${
          isCollapsed ? (isAr ? 'translate-x-full lg:translate-x-0 lg:w-[80px]' : '-translate-x-full lg:translate-x-0 lg:w-[80px]') : 'translate-x-0 w-[280px]'
        }`}
      >
        {/* Decorative background glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-64 pointer-events-none opacity-20" 
          style={{ background: `linear-gradient(to bottom, var(--brand-primary) 0%, transparent 100%)` }}
        />

        {/* Logo Area */}
        <div className={`h-20 flex items-center justify-center border-b border-[var(--brand-border)] shrink-0 relative z-10 transition-all duration-300 ${isCollapsed ? 'px-0' : 'px-6'}`}>
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            {brandLogo ? (
              <Image
                src={brandLogo}
                alt={brandName}
                width={36}
                height={36}
                className="object-contain"
              />
            ) : (
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--brand-primary-fg)] font-bold text-lg shadow-lg"
                style={{ background: `var(--brand-primary)` }}
              >
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div
            className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
              isCollapsed ? 'w-0 opacity-0' : 'mx-3 w-[160px] opacity-100'
            }`}
          >
            <span className="text-[var(--brand-background-fg)] font-bold tracking-tight text-sm leading-tight truncate">
              {brandName}
            </span>
            <span className="text-[var(--brand-primary)] text-[10px] font-semibold tracking-wider uppercase">
              {t(userRole as Parameters<typeof t>[0]) || userRole}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto space-y-2 px-3 relative z-10 custom-scrollbar">
          {visibleNavItems.map((item) => {
            const isActive = currentPath === item.href;
            const Icon = item.icon;
            const label = t(item.id as Parameters<typeof t>[0]);

            if (!item.active) {
              return (
                <div
                  key={item.id}
                  className={`group relative flex items-center px-3 py-3.5 rounded-xl opacity-40 cursor-not-allowed text-[var(--brand-background-fg-muted)] ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                  title={t('comingSoon')}
                >
                  <Icon size={20} strokeWidth={1.5} className="shrink-0" />
                  {!isCollapsed && <span className="mx-3 font-medium text-sm">{label}</span>}
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={`/${locale}/brands/${brandSlug}${item.href}`}
                className={`group flex items-center px-3 py-3.5 rounded-xl transition-all duration-300 relative ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'text-[var(--brand-background-fg)] bg-[var(--brand-background-active)]'
                    : 'text-[var(--brand-background-fg-muted)] hover:bg-[var(--brand-background-active)] hover:text-[var(--brand-background-fg)]'
                }`}
                title={isCollapsed ? label : undefined}
                onClick={() => {
                  if (window.innerWidth < 1024) setIsCollapsed(true);
                }}
              >
                {isActive && (
                  <div 
                    className={`absolute ${isAr ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} top-1/2 -translate-y-1/2 w-1 h-8`} 
                    style={{ background: `var(--brand-primary)`, boxShadow: `0 0 10px var(--brand-primary)` }}
                  />
                )}
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2 : 1.5} 
                  className={`shrink-0 transition-colors ${isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-background-fg-muted)] group-hover:text-[var(--brand-background-fg)]'}`} 
                />
                {!isCollapsed && <span className="mx-3 font-medium text-sm">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Area */}
        <div className="p-4 border-t border-[var(--brand-border)] shrink-0 relative z-10 bg-[var(--brand-background-active)]/50 backdrop-blur-md m-3 rounded-xl">
          <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-3' : 'justify-between'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
              <div 
                className="w-9 h-9 rounded-full p-[2px] shrink-0 shadow-lg"
                style={{ background: `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-text-accent) 100%)` }}
              >
                <div className="w-full h-full rounded-full border-2 border-[var(--brand-background)] overflow-hidden bg-[var(--brand-background)]">
                  {userAvatar ? (
                    <Image src={userAvatar} alt="User" width={36} height={36} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--brand-background-fg)] text-xs font-bold">
                      {userEmail.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              {!isCollapsed && (
                <div className="mx-3 overflow-hidden">
                  <p className="text-[var(--brand-background-fg)] text-xs font-semibold truncate max-w-[110px] dir-ltr" title={userEmail}>
                    {userEmail}
                  </p>
                  <p className="text-[var(--brand-background-fg-muted)] text-[10px] uppercase tracking-wider font-medium mt-0.5">
                    {t(userRole as Parameters<typeof t>[0]) || userRole}
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className={`text-[var(--brand-background-fg-muted)] hover:text-[var(--brand-danger)] transition-colors p-1.5 rounded-lg hover:bg-[var(--brand-danger)]/10 ${
                isCollapsed ? 'w-full flex justify-center mt-2 border-t border-[var(--brand-border)] pt-3' : ''
              }`}
              title={t('logout')}
            >
              <LogOut size={18} strokeWidth={1.5} className={isAr ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Topbar */}
        <header className="h-20 bg-[var(--brand-surface)]/80 backdrop-blur-xl border-b border-[var(--brand-border)] flex items-center justify-between px-4 md:px-8 shrink-0 z-10 sticky top-0">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="mx-2 md:mx-5 text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-primary)] bg-[var(--brand-surface-fg-muted)]/5 hover:bg-[var(--brand-primary)]/10 p-2 rounded-xl transition-all duration-200"
            >
              {isCollapsed ? <PanelLeftOpen size={20} strokeWidth={2} className={isAr ? 'rotate-180' : ''} /> : <PanelLeftClose size={20} strokeWidth={2} className={isAr ? 'rotate-180' : ''} />}
            </button>
            <div className="h-6 w-px bg-[var(--brand-border)] mx-3 md:mx-5" />
            <h1 className="text-xl md:text-2xl font-bold text-[var(--brand-surface-fg)] capitalize tracking-tight">
              {t(currentNav.id as Parameters<typeof t>[0])}
            </h1>
          </div>
          <div className="flex items-center space-x-6 space-x-reverse">
            <button className="relative text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-surface-fg)] transition-colors">
              <Bell size={22} strokeWidth={1.5} />
              <span 
                className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} w-2.5 h-2.5 border-2 border-[var(--brand-surface)] rounded-full`}
                style={{ backgroundColor: 'var(--brand-danger)' }}
              ></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
          <div 
            className="absolute top-0 left-0 w-full h-64 pointer-events-none -z-10" 
            style={{ background: `linear-gradient(to bottom, var(--brand-surface), transparent)` }}
          />
          <div className="max-w-7xl mx-auto min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
