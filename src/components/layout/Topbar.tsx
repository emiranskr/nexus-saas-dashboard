'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Menu,
  Bell,
  User,
  LogOut,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Package,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/utils';
import { NotificationDTO } from '@/types';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [notifications, setNotifications] = React.useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = React.useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState<boolean>(false);

  const notifRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Click outside to close dropdowns
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Başlık belirleme
  const getPageTitle = () => {
    if (pathname.includes('/users')) return 'Kullanıcı Yönetimi';
    if (pathname.includes('/products')) return 'Ürün ve Stok Yönetimi';
    if (pathname.includes('/orders')) return 'Sipariş ve İşlem Takibi';
    if (pathname.includes('/reports')) return 'Finansal Analiz ve Raporlama';
    if (pathname.includes('/notifications')) return 'Bildirim Merkezi';
    if (pathname.includes('/settings')) return 'Platform Ayarları';
    return 'Yönetim Özeti (Dashboard)';
  };

  // Bildirimleri çek
  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // sessizce geç
    }
  }, []);

  React.useEffect(() => {
    if (session) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000); // 20sn aralıkla kontrol
      return () => clearInterval(interval);
    }
  }, [session, fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch {}
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'STOCK':
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'ORDER':
        return <ShoppingBag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'SUCCESS':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md transition-all sm:px-6">
      {/* Sol Bölüm: Menü ve Başlık */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            {getPageTitle()}
          </h1>
          <span className="hidden sm:inline-block text-xs text-muted-foreground">
            Nexus SaaS Enterprise Console
          </span>
        </div>
      </div>

      {/* Sağ Bölüm: Bildirimler, Tema ve Kullanıcı */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Tema Değiştirici */}
        <ThemeToggle />

        {/* Bildirim Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsUserMenuOpen(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/50 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Bildirimler"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card p-4 shadow-2xl animate-in zoom-in-95 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <span className="font-bold text-sm text-foreground">
                  Bildirimler ({unreadCount} yeni)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Tümünü Okundu Say
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Yeni bildirim bulunmuyor.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 rounded-xl p-2.5 transition-colors border',
                        n.isRead
                          ? 'border-transparent bg-transparent opacity-75'
                          : 'border-border/60 bg-accent/40'
                      )}
                    >
                      <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-card border border-border">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-foreground truncate">
                          {n.title}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-border mt-3 text-center">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Tüm Bildirimleri Görüntüle →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Kullanıcı Menüsü */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-border bg-card/50 p-1.5 hover:bg-accent transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-xs">
              {session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden md:inline-block text-xs font-semibold text-foreground max-w-[100px] truncate">
              {session?.user?.name || 'Hesap'}
            </span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-2xl animate-in zoom-in-95 z-50">
              <div className="px-3 py-2 border-b border-border mb-1">
                <div className="font-bold text-xs text-foreground truncate">
                  {session?.user?.name}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {session?.user?.email}
                </div>
              </div>

              <Link
                href="/dashboard/settings"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Profil ve Güvenlik</span>
              </Link>

              <Link
                href="/dashboard/settings"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Hesap Tercihleri</span>
              </Link>

              <div className="my-1 border-t border-border" />

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span>Güvenli Çıkış Yap</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
