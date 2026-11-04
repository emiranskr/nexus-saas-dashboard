'use client';

import * as React from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  PieChart as PieChartIcon,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { useToast } from '@/components/ui/Toast';

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const { toast } = useToast();

  const [days, setDays] = React.useState(30);
  const [data, setData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchReport = React.useCallback(async (d: number) => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/reports?days=${d}`);
      if (res.ok) {
        const reportData = await res.json();
        setData(reportData);
      }
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  React.useEffect(() => {
    if (isAdmin) {
      fetchReport(days);
    }
  }, [isAdmin, days, fetchReport]);

  const handleExportCsv = () => {
    toast.info('CSV Dışa Aktarılıyor', `${days} günlük RFC-4180 formatında satış ve sipariş raporu indiriliyor...`);
    window.location.href = `/api/reports?format=csv&days=${days}`;
  };

  const COLORS = ['#10b981', '#38bdf8', '#f59e0b', '#ef4444'];

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium">Yetki kontrolü yapılıyor...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AccessDenied
        pageName="Finansal Analiz ve Raporlama"
        description="Dönemsel gelir grafikleri, sipariş analizleri ve finansal CSV raporlama ekranı yalnızca Sistem Yöneticisi (ADMIN) yetkisine sahip kullanıcılar tarafından görüntülenebilir."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Dışa Aktarma Butonu */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <span>Finansal Analiz ve Raporlama</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Dönemsel gelir akışı, en çok satan ürün sıralaması ve sipariş dağılım grafikleri.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Tarih Aralığı */}
          <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl">
            {[
              { label: '7 Gün', val: 7 },
              { label: '30 Gün', val: 30 },
              { label: '90 Gün', val: 90 },
              { label: '1 Yıl', val: 365 },
            ].map((btn) => (
              <button
                key={btn.val}
                onClick={() => setDays(btn.val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  days === btn.val
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <Button onClick={handleExportCsv} className="flex items-center gap-2 whitespace-nowrap">
            <Download className="h-4 w-4" />
            <span>CSV Dışa Aktar</span>
          </Button>
        </div>
      </div>

      {/* Finansal Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Dönem Toplam Geliri
            </CardTitle>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {formatCurrency(data?.summary?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Son {days} günlük onaylanmış sipariş cirosu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Toplam Sipariş Adedi
            </CardTitle>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {data?.summary?.orderCount || 0} adet
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dönem içinde açılan tüm işlemler
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ortalama Sipariş Değeri (AOV)
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {formatCurrency(data?.summary?.averageOrderValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sipariş başına düşen sepet tutarı
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafikler Izgarası */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* En Çok Satan Ürünler Bar Grafiği (2 Sütun) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              En Çok Satan Ürünler & Modüller
            </CardTitle>
            <CardDescription className="text-xs">
              Toplam ciro katkısına göre ürün performansı
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.topProducts || []}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `₺${val / 1000}k`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={11}
                    width={120}
                    tickFormatter={(val) => (val.length > 15 ? val.slice(0, 15) + '...' : val)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '12px',
                      color: 'hsl(var(--foreground))',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    }}
                    itemStyle={{
                      color: 'hsl(var(--foreground))',
                    }}
                    labelStyle={{
                      color: 'hsl(var(--foreground))',
                      fontWeight: 600,
                    }}
                    formatter={(val: number) => [formatCurrency(val), 'Toplam Satış']}
                  />
                  <Bar dataKey="totalRevenue" fill="#38bdf8" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sipariş Durum Dağılımı Pasta Grafiği (1 Sütun) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>Sipariş Durum Dağılımı</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Süreçteki siparişlerin yüzdesel dağılımı
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.statusDistribution || []}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={5}
                  >
                    {data?.statusDistribution?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '12px',
                      color: 'hsl(var(--foreground))',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    }}
                    itemStyle={{
                      color: 'hsl(var(--foreground))',
                    }}
                    labelStyle={{
                      color: 'hsl(var(--foreground))',
                      fontWeight: 600,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              {data?.statusDistribution?.map((s: any, idx: number) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate">{s.name}:</span>
                  <span className="font-bold text-foreground">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rapor Detay Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground">
            Dönem Sipariş Geçmişi
          </CardTitle>
          <CardDescription className="text-xs">
            Dışa aktarılan veri tablosunun canlı önizlemesi
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-accent/40 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-semibold">Sipariş No</th>
                  <th className="py-3 px-4 font-semibold">Müşteri</th>
                  <th className="py-3 px-4 font-semibold">Tarih</th>
                  <th className="py-3 px-4 font-semibold">Tutar</th>
                  <th className="py-3 px-4 font-semibold">Ödeme</th>
                  <th className="py-3 px-4 font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data?.orders?.map((o: any) => (
                  <tr key={o.id} className="hover:bg-accent/20">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {o.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-foreground font-semibold">
                      {o.user?.name}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground">
                      {formatCurrency(o.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {o.paymentMethod}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          o.status === 'COMPLETED'
                            ? 'success'
                            : o.status === 'PROCESSING'
                            ? 'info'
                            : o.status === 'CANCELLED'
                            ? 'destructive'
                            : 'warning'
                        }
                      >
                        {o.status === 'COMPLETED'
                          ? 'Tamamlandı'
                          : o.status === 'PROCESSING'
                          ? 'İşleniyor'
                          : o.status === 'CANCELLED'
                          ? 'İptal Edildi'
                          : 'Beklemede'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
