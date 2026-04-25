'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  Settings,
  LogOut,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';

export default function AdminShell({
  children,
  locale,
  adminSlug,
  adminEmail,
  adminAvatar,
}: {
  children: React.ReactNode;
  locale: string;
  adminSlug: string;
  adminEmail: string;
  adminAvatar: string;
}) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const router = useRouter();
  const t = useTranslations('admin.shell');
  
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('scamurai_admin_sidebar_collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    } else {
      // Default to collapsed on small screens, expanded on large
      setIsCollapsed(window.innerWidth < 1024);
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('scamurai_admin_sidebar_collapsed', String(newState));
  };

  // Use a more robust way to extract the path relative to the admin root
  const baseSegment = `/${locale}/${adminSlug}`;
  let currentPath = '/dashboard';
  
  if (pathname.startsWith(baseSegment)) {
    const relativePath = pathname.substring(baseSegment.length);
    if (relativePath) {
      currentPath = relativePath;
    }
  }
  
  const NAV_ITEMS = [
    { id: 'dashboard', icon: LayoutDashboard, href: '/dashboard', active: true },
    { id: 'applications', icon: FileText, href: '/applications', active: true },
    { id: 'brands', icon: Building2, href: '/brands', active: false },
    { id: 'users', icon: Users, href: '/users', active: false },
    { id: 'settings', icon: Settings, href: '/settings', active: false },
  ];
  
  // Find current nav item, handling nested paths (e.g., /applications?id=123)
  const currentNav = NAV_ITEMS.find(n => 
    currentPath === n.href || currentPath.startsWith(n.href + '/')
  ) || NAV_ITEMS[0];

  const handleLogout = async () => {
    await signOut();
    router.push(`/${locale}`);
  };

  const isAr = locale === 'ar';

  return (
    <div 
      className={`flex h-screen w-full bg-[#f8fafc] font-sans text-slate-800 overflow-hidden ${isAr ? 'font-arabic' : 'font-sans'}`} 
      dir={isAr ? 'rtl' : 'ltr'}
      suppressHydrationWarning
    >
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative flex-shrink-0 bg-gradient-to-b from-navy to-[#1e293b] shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex flex-col z-50 h-full ${
          isCollapsed ? (isAr ? 'translate-x-full lg:translate-x-0 lg:w-[80px]' : '-translate-x-full lg:translate-x-0 lg:w-[80px]') : 'translate-x-0 w-[280px]'
        }`}
      >
        {/* Decorative background glow */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-sky/10 to-transparent pointer-events-none" />

        {/* Logo Area */}
        <div className={`h-20 flex items-center justify-center border-b border-white/5 shrink-0 relative z-10 transition-all duration-300 ${isCollapsed ? 'px-0' : 'px-6'}`}>
          <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
            <Image
              src="/logos/secondy logo 2.svg"
              alt="Scamurai"
              width={32}
              height={32}
              className="object-contain drop-shadow-[0_0_8px_rgba(79,197,223,0.4)]"
            />
          </div>
          <div
            className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
              isCollapsed ? 'w-0 opacity-0' : 'mx-3 w-[140px] opacity-100'
            }`}
          >
            <span className="text-white font-bold tracking-widest text-sm leading-tight uppercase">
              Scamurai
            </span>
            <span className="text-sky text-[10px] font-semibold tracking-wider uppercase">
              {t('masterAdmin')}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto space-y-2 px-3 relative z-10 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.href;
            const Icon = item.icon;
            const label = t(item.id as any);

            if (!item.active) {
              return (
                <div
                  key={item.id}
                  className={`group relative flex items-center px-3 py-3.5 rounded-xl opacity-40 cursor-not-allowed text-white/50 ${
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
                href={`/${locale}/${adminSlug}${item.href}`}
                className={`group flex items-center px-3 py-3.5 rounded-xl transition-all duration-300 relative ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'text-white bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
                title={isCollapsed ? label : undefined}
                onClick={() => {
                  if (window.innerWidth < 1024) setIsCollapsed(true);
                }}
              >
                {isActive && (
                  <div className={`absolute ${isAr ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} top-1/2 -translate-y-1/2 w-1 h-8 bg-sky shadow-[0_0_10px_rgba(79,197,223,0.6)]`} />
                )}
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} className={`shrink-0 transition-colors ${isActive ? 'text-sky' : 'text-slate-400 group-hover:text-white'}`} />
                {!isCollapsed && <span className="mx-3 font-medium text-sm">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Area */}
        <div className="p-4 border-t border-white/5 shrink-0 relative z-10 bg-black/20 backdrop-blur-md m-3 rounded-xl">
          <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-3' : 'justify-between'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky to-blue-600 p-[2px] shrink-0">
                <div className="w-full h-full rounded-full border-2 border-[#1e293b] overflow-hidden bg-navy">
                  {adminAvatar ? (
                    <img src={adminAvatar} alt="Admin" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">A</div>
                  )}
                </div>
              </div>
              {!isCollapsed && (
                <div className="mx-3 overflow-hidden">
                  <p className="text-white text-xs font-semibold truncate max-w-[110px] dir-ltr" title={adminEmail}>
                    {adminEmail}
                  </p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider font-medium mt-0.5">
                    {t('platformAdmin')}
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className={`text-slate-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10 ${
                isCollapsed ? 'w-full flex justify-center mt-2 border-t border-white/5 pt-3' : ''
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
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.02)] z-10 sticky top-0">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="mx-2 md:mx-5 text-slate-400 hover:text-sky bg-slate-50 hover:bg-sky/10 p-2 rounded-xl transition-all duration-200"
            >
              {isCollapsed ? <PanelLeftOpen size={20} strokeWidth={2} className={isAr ? 'rotate-180' : ''} /> : <PanelLeftClose size={20} strokeWidth={2} className={isAr ? 'rotate-180' : ''} />}
            </button>
            <div className="h-6 w-px bg-slate-200 mx-3 md:mx-5" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 capitalize tracking-tight">
              {t(currentNav.id as any)}
            </h1>
          </div>
          <div className="flex items-center space-x-6 space-x-reverse">
            <button className="relative text-slate-400 hover:text-slate-700 transition-colors">
              <Bell size={22} strokeWidth={1.5} />
              <span className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full`}></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
          <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-white to-transparent pointer-events-none -z-10" />
          <div className="max-w-7xl mx-auto min-w-0">
            <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-8 bg-slate-100 rounded w-1/4"></div><div className="h-64 bg-slate-100 rounded"></div></div>}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
