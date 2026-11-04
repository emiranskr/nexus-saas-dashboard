import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/auth';
import { calculatePercentageChange } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d'; // 7d, 30d, 90d, 1y

    const now = new Date();
    let daysToSubtract = 30;
    if (range === '7d') daysToSubtract = 7;
    else if (range === '90d') daysToSubtract = 90;
    else if (range === '1y') daysToSubtract = 365;

    const currentPeriodStart = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - daysToSubtract * 2 * 24 * 60 * 60 * 1000);

    // Grafik Zaman Aralığı Tanımları (Dinamik Aralık Desteği)
    let chartStartDate: Date;
    if (range === '7d') {
      chartStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
    } else if (range === '30d') {
      chartStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
    } else if (range === '90d') {
      chartStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (range === '1y') {
      chartStartDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    } else {
      // 6m / varsayılan 6 aylık görünüm (Vitest performance optimizasyonu)
      chartStartDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Tüm dashboard verilerini N+1 döngüleri olmaksızın toplu ve paralel sorgularla çek
    const [
      currentOrders,
      previousOrders,
      totalUsers,
      currentNewUsers,
      previousNewUsers,
      totalOrdersCount,
      chartOrders,
      baseUserCount,
      windowUsers,
      recentOrders,
      recentActivities,
    ] = await Promise.all([
      // 1. Mevcut Dönem Siparişleri
      prisma.order.findMany({
        where: {
          status: { in: ['COMPLETED', 'PROCESSING'] },
          createdAt: { gte: currentPeriodStart },
        },
      }),
      // 2. Önceki Dönem Siparişleri
      prisma.order.findMany({
        where: {
          status: { in: ['COMPLETED', 'PROCESSING'] },
          createdAt: { gte: previousPeriodStart, lt: currentPeriodStart },
        },
      }),
      // 3. Aktif Kullanıcı Sayısı
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      // 4. Mevcut Dönemde Kayıt Olan Kullanıcılar
      prisma.user.count({
        where: { createdAt: { gte: currentPeriodStart } },
      }),
      // 5. Önceki Dönemde Kayıt Olan Kullanıcılar
      prisma.user.count({
        where: { createdAt: { gte: previousPeriodStart, lt: currentPeriodStart } },
      }),
      // 6. Toplam Sipariş Sayısı
      prisma.order.count(),
      // 7. Grafik İçin Siparişler (Toplu sorgu)
      prisma.order.findMany({
        where: {
          status: { in: ['COMPLETED', 'PROCESSING'] },
          createdAt: { gte: chartStartDate, lt: currentMonthEnd },
        },
        select: {
          createdAt: true,
          totalAmount: true,
        },
      }),
      // 8. Grafik penceresi öncesindeki temel kullanıcı sayısı
      prisma.user.count({
        where: { createdAt: { lt: chartStartDate } },
      }),
      // 9. Grafik penceresinde kayıt olan kullanıcılar
      prisma.user.findMany({
        where: {
          createdAt: { gte: chartStartDate, lt: currentMonthEnd },
        },
        select: {
          createdAt: true,
        },
      }),
      // 10. Son Siparişler
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      }),
      // 11. Son Aktiviteler
      prisma.activityLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    // 1. Gelir Hesaplamaları
    const currentRevenue = currentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const revenueChange = calculatePercentageChange(currentRevenue, previousRevenue);

    // 2. Kullanıcı Değişim Hesaplaması
    const usersChange = calculatePercentageChange(currentNewUsers, previousNewUsers);

    // 3. Sipariş Değişim Hesaplaması
    const currentOrdersCount = currentOrders.length;
    const previousOrdersCount = previousOrders.length;
    const ordersChange = calculatePercentageChange(currentOrdersCount, previousOrdersCount);

    // 4. Ortalama Sipariş Tutarı (AOV - Average Order Value) Gerçek Metriği
    const currentAOV = currentOrdersCount > 0 ? Math.round((currentRevenue / currentOrdersCount) * 100) / 100 : 0;
    const previousAOV = previousOrdersCount > 0 ? Math.round((previousRevenue / previousOrdersCount) * 100) / 100 : 0;
    const aovChange = calculatePercentageChange(currentAOV, previousAOV);

    // 5. & 6. Dönemsel Gelir ve Kullanıcı Büyüme Grafikleri (Bellekte O(N) Gruplama)
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const revenueChart = [];
    const userGrowthChart = [];

    if (range === '7d') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0);
        const nextD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1, 0, 0, 0);
        const dayLabel = `${d.getDate()} ${months[d.getMonth()]}`;

        const dayOrders = chartOrders.filter((o) => o.createdAt >= d && o.createdAt < nextD);
        const dayRev = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        revenueChart.push({
          name: dayLabel,
          gelir: Math.round(dayRev),
          siparis: dayOrders.length,
        });

        const usersBeforeNextD = windowUsers.filter((u) => u.createdAt < nextD).length;
        userGrowthChart.push({
          name: dayLabel,
          kullanici: baseUserCount + usersBeforeNextD,
        });
      }
    } else if (range === '30d') {
      // 30 Günlük Gerçek Dönem Dağılımı (Günlük)
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0);
        const nextD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1, 0, 0, 0);
        const dayLabel = `${d.getDate()} ${months[d.getMonth()]}`;

        const dayOrders = chartOrders.filter((o) => o.createdAt >= d && o.createdAt < nextD);
        const dayRev = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        revenueChart.push({
          name: dayLabel,
          gelir: Math.round(dayRev),
          siparis: dayOrders.length,
        });

        const usersBeforeNextD = windowUsers.filter((u) => u.createdAt < nextD).length;
        userGrowthChart.push({
          name: dayLabel,
          kullanici: baseUserCount + usersBeforeNextD,
        });
      }
    } else if (range === '1y') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthName = months[d.getMonth()];

        const monthOrders = chartOrders.filter((o) => o.createdAt >= d && o.createdAt < nextD);
        const monthRev = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        revenueChart.push({
          name: monthName,
          gelir: Math.round(monthRev),
          siparis: monthOrders.length,
        });

        const addedInWindowBeforeNextD = windowUsers.filter((u) => u.createdAt < nextD).length;
        userGrowthChart.push({
          name: monthName,
          kullanici: baseUserCount + addedInWindowBeforeNextD,
        });
      }
    } else if (range === '90d') {
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthName = months[d.getMonth()];

        const monthOrders = chartOrders.filter((o) => o.createdAt >= d && o.createdAt < nextD);
        const monthRev = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        revenueChart.push({
          name: monthName,
          gelir: Math.round(monthRev),
          siparis: monthOrders.length,
        });

        const addedInWindowBeforeNextD = windowUsers.filter((u) => u.createdAt < nextD).length;
        userGrowthChart.push({
          name: monthName,
          kullanici: baseUserCount + addedInWindowBeforeNextD,
        });
      }
    } else {
      // 6 Aylık Görünüm (range === '6m' veya genel fallback)
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthName = months[d.getMonth()];

        const monthOrders = chartOrders.filter((o) => o.createdAt >= d && o.createdAt < nextD);
        const monthRev = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        revenueChart.push({
          name: monthName,
          gelir: Math.round(monthRev),
          siparis: monthOrders.length,
        });

        const addedInWindowBeforeNextD = windowUsers.filter((u) => u.createdAt < nextD).length;
        userGrowthChart.push({
          name: monthName,
          kullanici: baseUserCount + addedInWindowBeforeNextD,
        });
      }
    }

    return NextResponse.json({
      metrics: {
        totalRevenue: currentRevenue,
        revenueChange,
        totalUsers,
        currentNewUsers,
        usersChange,
        totalOrders: totalOrdersCount,
        periodOrders: currentOrdersCount,
        ordersChange,
        averageOrderValue: currentAOV,
        aovChange,
        // Geriye dönük uyumluluk için korundu
        activeSubscriptions: totalUsers,
        subscriptionsChange: usersChange,
      },
      revenueChart,
      userGrowthChart,
      recentOrders,
      recentActivities,
    });
  } catch (error) {
    return handleApiError(error, 'İstatistikler yüklenirken hata oluştu');
  }
}
