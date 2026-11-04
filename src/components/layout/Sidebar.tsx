'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingBag,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function Sidebar({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      title: 'Kullanıcılar',
      href: '/dashboard/users',
      icon: Users,
      adminOnly: true,
      badge: 'Admin',
    },
    {
      title: 'Ürün & Stok',
      href: '/dashboard/products',
      icon: Package,
      adminOnly: false,
    },
    {
      title: 'Siparişler',
      href: '/dashboard/orders',
      icon: ShoppingBag,
      adminOnly: false,
    },
    {
      title: 'Raporlar',
      href: '/dashboard/reports',
      icon: BarChart3,
      adminOnly: true,
    },
    {
      title: 'Bildirimler',
      href: '/dashboard/notifications',
      icon: Bell,
      adminOnly: false,
    },
    {
      title: 'Ayarlar',
      href: '/dashboard/settings',
      icon: Settings,
      adminOnly: false,
    },
  ];

  return (
    <>
      {/* Mobil Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Konteyneri */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 lg:static',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo & Marka */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 overflow-hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
              <Layers className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold tracking-tight text-foreground text-lg">
                  NEXUS
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  SaaS Platform
                </span>
              </div>
            )}
          </Link>

          {/* Daralt / Genişlet Butonu (Desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={isCollapsed ? 'Genişlet' : 'Daralt'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigasyon Linkleri */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;

            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group relative overflow-hidden',
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25'
                    : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                )}
                title={isCollapsed ? item.title : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/60 rounded-r-full" />
                )}
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />

                {!isCollapsed && (
                  <span className="flex-1 truncate">{item.title}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Kullanıcı Rolü & Alt Panel */}
        <div className="border-t border-border p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl bg-accent/40 p-2.5 border border-border/60',
              isCollapsed && 'justify-center p-2'
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Shield className="h-4 w-4" />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-xs font-bold text-foreground">
                  {session?.user?.name || 'Kullanıcı'}
                </span>
                <span className="truncate text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {isAdmin ? 'Sistem Yöneticisi' : 'Standart Kullanıcı'}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
