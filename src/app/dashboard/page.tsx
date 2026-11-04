'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingBag,
  CreditCard,
  ArrowUpRight,
  Activity,
  Calendar,
  Clock,
  RefreshCw,
  Package,
  UserCheck,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrendBadge } from '@/components/ui/TrendBadge';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { DashboardStats } from '@/types';

// Özel Grafik Tooltip Bileşeni
function CustomChartTooltip({ active, payload, label, unit = '₺' }: any) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const value = typeof item.value === 'number' ? item.value : 0;
    const formatted = unit === '₺' ? formatCurrency(value) : `${value.toLocaleString('tr-TR')} ${unit}`;

    return (
      <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-xl backdrop-blur-md">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="mt-1 text-sm font-bold text-foreground">
          {formatted}
        </p>
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [range, setRange] = React.useState('30d');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const fetchStats = React.useCallback(async (r: string) => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || !isAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      setApiError(null);
      const res = await fetch(`/api/dashboard/stats?range=${r}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setApiError(errData.error || 'İstatistikler yüklenirken bir sorun oluştu.');
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
      setApiError('Sunucu bağlantısı sağlanamadı.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [status, isAdmin]);

  React.useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      fetchStats(range);
    } else if (status === 'authenticated' && !isAdmin) {
      setIsLoading(false);
    }
  }, [range, status, isAdmin, fetchStats]);

  const getStatusBadge = (orderStatus: string) => {
    switch (orderStatus) {
      case 'COMPLETED':
        return <Badge variant="success">Tamamlandı</Badge>;
      case 'PROCESSING':
        return <Badge variant="secondary">İşleniyor</Badge>;
      case 'PENDING':
        return <Badge variant="warning">Beklemede</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">İptal</Badge>;
      default:
        return <Badge variant="outline">{orderStatus}</Badge>;
    }
  };

  const getRangeLabel = () => {
    switch (range) {
      case '7d': return 'Son 7 gün';
      case '90d': return 'Son 90 gün';
      case '1y': return 'Son 1 yıl';
      default: return 'Son 30 gün';
    }
  };

  const getCompareLabel = () => {
    switch (range) {
      case '7d': return 'önceki 7 güne göre';
      case '90d': return 'önceki 90 güne göre';
      case '1y': return 'önceki yıla göre';
      default: return 'önceki 30 güne göre';
    }
  };

  const getChartDescription = () => {
    switch (range) {
      case '7d': return 'Son 7 günün günlük sipariş ve gelir dağılımı';
      case '90d': return 'Son 90 günün dönemsel sipariş ve gelir dağılımı';
      case '1y': return 'Son 1 yılın aylık sipariş ve gelir dağılımı';
      default: return 'Son 30 günün günlük sipariş ve gelir dağılımı';
    }
  };

  // Yükleme Durumu (Skeletons - İlk açılış titremesi ve sıfır flaşı önlenir)
  if (status === 'loading' || (isAdmin && isLoading && !stats && !apiError)) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-64 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-20" />
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 space-y-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-72 w-full" />
          </Card>
          <Card className="p-6 space-y-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-72 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  // API Hata Durumu (Gerçek Sıfır Veri ile Hata Durumu Ayrıştırıldı)
  if (apiError && !stats && isAdmin) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">İstatistikler Yüklenemedi</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">{apiError}</p>
        <Button onClick={() => fetchStats(range)} className="mt-4" size="sm">
          Tekrar Dene
        </Button>
      </div>
    );
  }

  // Standart Müşteri (USER) Rolü Görünümü
  if (!isAdmin && session) {
    return (
      <div className="space-y-6">
        {/* Karşılama Bannerı */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent p-6 sm:p-8">
          <div className="relative z-10 max-w-2xl space-y-2">
            <Badge variant="outline" className="bg-card/60 backdrop-blur font-semibold">
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              Müşteri Portalı
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Hoş Geldiniz, {session.user?.name}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nexus platformu üzerinden geçmiş siparişlerinizi takip edebilir, yeni kurumsal lisans satın alabilir ve profil ayarlarınızı güncelleyebilirsiniz.
            </p>
          </div>
        </div>

        {/* Hızlı Erişim Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/dashboard/orders">
            <Card className="hover:border-primary/50 transition-all hover:-translate-y-0.5 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-foreground">
                  Siparişlerim
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Kayıtlı siparişlerinizi, fatura detaylarını ve anlık durumlarını inceleyin.
                </p>
                <span className="mt-4 inline-flex items-center text-xs font-semibold text-primary">
                  Siparişleri Görüntüle <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/products">
            <Card className="hover:border-primary/50 transition-all hover:-translate-y-0.5 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-foreground">
                  Ürün Kataloğu
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Kurumsal SaaS planlarını ve mevcut lisans seçeneklerini keşfedin.
                </p>
                <span className="mt-4 inline-flex items-center text-xs font-semibold text-primary">
                  Kataloğu İncele <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/settings">
            <Card className="hover:border-primary/50 transition-all hover:-translate-y-0.5 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-foreground">
                  Hesap Ayarları
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <UserCheck className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  İsim, e-posta, şifre ve tema tercihlerinizi güvenli şekilde yönetin.
                </p>
                <span className="mt-4 inline-flex items-center text-xs font-semibold text-primary">
                  Ayarlara Git <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  const metrics = stats?.metrics;

  return (
    <div className="space-y-6">
      {/* Üst Karşılama ve Filtre Şeridi */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span>Genel Bakış</span>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 border-sky-500/20 bg-sky-500/10">
              Yönetici Paneli
            </Badge>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Gerçek zamanlı SaaS gelirleri, sipariş hacmi ve kullanıcı büyüme analizi.
          </p>
        </div>

        {/* Tarih Aralığı Filtresi */}
        <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl shadow-sm">
          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Aralık:</span>
          </div>
          {[
            { label: '7 Gün', value: '7d' },
            { label: '30 Gün', value: '30d' },
            { label: '90 Gün', value: '90d' },
            { label: '1 Yıl', value: '1y' },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setRange(btn.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                range === btn.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {btn.label}
            </button>
          ))}
          <button
            onClick={() => fetchStats(range)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
            title="Yenile"
            aria-label="İstatistikleri Yenile"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Temel KPI Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam Gelir */}
        <Card className="hover:border-primary/40 transition-all hover:-translate-y-0.5 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Toplam Gelir
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {formatCurrency(metrics?.totalRevenue || 0)}
            </div>
            <TrendBadge
              value={metrics?.revenueChange || 0}
              label={getCompareLabel()}
            />
          </CardContent>
        </Card>

        {/* Yeni Kayıtlı Kullanıcılar */}
        <Card className="hover:border-primary/40 transition-all hover:-translate-y-0.5 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Yeni Kullanıcılar
              </CardTitle>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                Aktif Toplam: {(metrics?.totalUsers || 0).toLocaleString('tr-TR')}
              </div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {(metrics?.currentNewUsers ?? metrics?.totalUsers ?? 0).toLocaleString('tr-TR')}
            </div>
            <TrendBadge
              value={metrics?.usersChange || 0}
              label={getCompareLabel()}
            />
          </CardContent>
        </Card>

        {/* Dönem Siparişleri */}
        <Card className="hover:border-primary/40 transition-all hover:-translate-y-0.5 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dönem Siparişleri
              </CardTitle>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                Tüm Zamanlar: {(metrics?.totalOrders || 0).toLocaleString('tr-TR')}
              </div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {(metrics?.periodOrders ?? metrics?.totalOrders ?? 0).toLocaleString('tr-TR')}
            </div>
            <TrendBadge
              value={metrics?.ordersChange || 0}
              label={getCompareLabel()}
            />
          </CardContent>
        </Card>

        {/* Ortalama Sipariş Tutarı (AOV) */}
        <Card className="hover:border-primary/40 transition-all hover:-translate-y-0.5 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ortalama Sipariş
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {formatCurrency(metrics?.averageOrderValue || 0)}
            </div>
            <TrendBadge
              value={metrics?.aovChange || 0}
              label={getCompareLabel()}
            />
          </CardContent>
        </Card>
      </div>

      {/* Grafikler Bölümü */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gelir Trendi Alan Grafiği (2 Sütun) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Gelir Trendi
              </CardTitle>
              <CardDescription className="text-xs">
                {getChartDescription()}
              </CardDescription>
            </div>
            <Link
              href="/dashboard/reports"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Detaylı Rapor</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.revenueChart || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₺${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                  />
                  <Tooltip content={<CustomChartTooltip unit="₺" />} />
                  <Area
                    type="monotone"
                    dataKey="gelir"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorGelir)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Kullanıcı Büyüme Bar Grafiği (1 Sütun) */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-foreground">
              Kullanıcı Büyümesi
            </CardTitle>
            <CardDescription className="text-xs">
              Kümülatif platform kayıtlı kullanıcı sayısı
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats?.userGrowthChart || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomChartTooltip unit="kullanıcı" />} />
                  <Bar
                    dataKey="kullanici"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alt Bölüm: Son Siparişler ve Son Aktiviteler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Son Siparişler Tablosu (2 Sütun) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Son Siparişler
              </CardTitle>
              <CardDescription className="text-xs">
                Platform üzerinden gerçekleştirilen en son işlemler
              </CardDescription>
            </div>
            <Link
              href="/dashboard/orders"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Tümünü Gör</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {(!stats?.recentOrders || stats.recentOrders.length === 0) ? (
              <EmptyState
                icon={ShoppingBag}
                title="Henüz Sipariş Yok"
                description="Platform üzerinde henüz tamamlanmış veya işlenen bir sipariş kaydı bulunmuyor."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold">
                      <th className="pb-3 font-semibold">Sipariş No</th>
                      <th className="pb-3 font-semibold">Müşteri</th>
                      <th className="pb-3 font-semibold">Tarih</th>
                      <th className="pb-3 font-semibold">Tutar</th>
                      <th className="pb-3 font-semibold">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {stats.recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-accent/30 transition-colors">
                        <td className="py-3 font-mono font-bold text-foreground">
                          {order.orderNumber}
                        </td>
                        <td className="py-3">
                          <div className="font-semibold text-foreground">
                            {order.user?.name || 'Müşteri'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {order.user?.email}
                          </div>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="py-3 font-bold text-foreground">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="py-3">{getStatusBadge(order.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Son Sistem Aktiviteleri (1 Sütun) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>Son Aktiviteler</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Sistem denetim ve kullanıcı işlem günlükleri
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!stats?.recentActivities || stats.recentActivities.length === 0) ? (
              <EmptyState
                icon={Activity}
                title="Aktivite Kaydı Yok"
                description="Sistemde henüz kaydedilmiş bir denetim veya kullanıcı aktivitesi bulunmuyor."
              />
            ) : (
              <div className="space-y-4">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 text-xs">
                    <div className="mt-0.5 p-1 rounded-md bg-accent text-primary border border-border">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">
                        {activity.action}
                      </div>
                      <p className="text-muted-foreground line-clamp-2 mt-0.5">
                        {activity.details || 'İşlem gerçekleştirildi'}
                      </p>
                      <span className="text-[10px] text-muted-foreground/80 mt-1 block font-mono">
                        {formatDateTime(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
