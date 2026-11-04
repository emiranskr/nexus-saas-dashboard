'use client';

import * as React from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Info,
  Check,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime, cn } from '@/lib/utils';
import { NotificationDTO } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = React.useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchNotifications = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id?: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : {}),
      });
      if (res.ok) {
        if (id) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
          );
          setUnreadCount((c) => Math.max(0, c - 1));
          toast.success('Bildirim Okundu', 'Bildirim okundu olarak işaretlendi.');
        } else {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
          setUnreadCount(0);
          toast.success('Tüm Bildirimler Okundu', 'Tüm bildirimleriniz okundu olarak güncellendi.');
        }
      }
    } catch {
      toast.error('Hata', 'Bildirim güncellenirken bir sorun oluştu.');
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'STOCK':
        return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'ORDER':
        return <ShoppingBag className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case 'SUCCESS':
        return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Info className="h-5 w-5 text-sky-600 dark:text-sky-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'STOCK':
        return <Badge variant="warning">Kritik Stok</Badge>;
      case 'ORDER':
        return <Badge variant="success">Sipariş</Badge>;
      case 'SUCCESS':
        return <Badge variant="success">Sistem</Badge>;
      default:
        return <Badge variant="secondary">Bilgilendirme</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <span>Bildirim Merkezi</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Sistem uyarıları, sipariş bildirimleri ve kritik stok seviyeleri ({unreadCount} okunmamış).
          </p>
        </div>

        {unreadCount > 0 && (
          <Button onClick={() => markAsRead()} variant="outline" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Tümünü Okundu Olarak İşaretle</span>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6 divide-y divide-border/60">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Bildirimler yükleniyor...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-4">
              <EmptyState
                icon={Bell}
                title="Yeni Bildirim Yok"
                description="Harika! Şu anda okunmamış veya bekleyen herhangi bir sistem bildirimi bulunmuyor."
              />
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                  !n.isRead && 'bg-accent/20 -mx-4 px-4 rounded-xl'
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-card border border-border shrink-0 mt-0.5">
                    {getNotifIcon(n.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{n.title}</span>
                      {getTypeBadge(n.type)}
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[11px] text-muted-foreground/80 mt-1.5 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(n.createdAt)}
                    </span>
                  </div>
                </div>

                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(n.id)}
                    className="self-end sm:self-center text-xs text-primary"
                  >
                    <span>Okundu</span>
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
