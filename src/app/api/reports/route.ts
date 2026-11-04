import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');
    const days = parseInt(searchParams.get('days') || '30', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. İlgili aralıktaki tamamlanan/işlenen siparişler
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true, category: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. CSV Dışa Aktarma İsteği
    if (format === 'csv') {
      const headers = ['Siparis No', 'Tarih', 'Musteri', 'E-posta', 'Tutar (TL)', 'Durum', 'Odeme Yontemi'];
      const rows = orders.map(o => [
        o.orderNumber,
        o.createdAt.toISOString().split('T')[0],
        `"${o.user.name.replace(/"/g, '""')}"`,
        o.user.email,
        o.totalAmount.toFixed(2),
        o.status,
        o.paymentMethod,
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="nexus_rapor_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // 3. Ürün Satış Sıralaması (Top Selling Products)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate },
          status: { in: ['COMPLETED', 'PROCESSING'] },
        },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, price: true } },
      },
    });

    const productSalesMap = new Map<string, { name: string; sku: string; unitsSold: number; totalRevenue: number }>();

    for (const item of orderItems) {
      const existing = productSalesMap.get(item.productId) || {
        name: item.product.name,
        sku: item.product.sku,
        unitsSold: 0,
        totalRevenue: 0,
      };
      existing.unitsSold += item.quantity;
      existing.totalRevenue += item.subtotal;
      productSalesMap.set(item.productId, existing);
    }

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 8);

    // 4. Sipariş Durum Dağılımı
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate } },
      _count: { status: true },
    });

    const statusDistribution = statusCounts.map(s => ({
      name: s.status,
      count: s._count.status,
    }));

    // 5. Özet Finansallar
    const validOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'PROCESSING');
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const averageOrderValue = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

    return NextResponse.json({
      summary: {
        totalRevenue,
        orderCount: orders.length,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        periodDays: days,
      },
      topProducts,
      statusDistribution,
      orders: orders.slice(0, 15),
    });
  } catch (error) {
    return handleApiError(error, 'Rapor oluşturulamadı');
  }
}
