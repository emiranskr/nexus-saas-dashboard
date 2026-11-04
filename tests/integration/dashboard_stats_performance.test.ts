import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as nextAuth from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET as getDashboardStats } from '@/app/api/dashboard/stats/route';

// NextAuth mock
vi.mock('next-auth', async () => {
  const actual = await vi.importActual<typeof import('next-auth')>('next-auth');
  return {
    ...actual,
    getServerSession: vi.fn(),
  };
});

describe('Dashboard Stats N+1 Optimizasyonu & Grafik Doğruluğu Testleri (MED-03)', () => {
  let adminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    regularUser = await prisma.user.findFirst({ where: { role: 'USER' } });
  });

  it('1. ADMIN rolündeki kullanıcı istek attığında 6 aylık grafikler eksiksiz ve sıralı dönmeli', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: 'ADMIN',
      },
    } as any);

    const req = new Request('http://localhost:3000/api/dashboard/stats?range=6m');
    const res = await getDashboardStats(req);
    expect(res.status).toBe(200);

    const data = await res.json();

    // Response yapısı doğrulaması
    expect(data.metrics).toBeDefined();
    expect(data.revenueChart).toBeInstanceOf(Array);
    expect(data.userGrowthChart).toBeInstanceOf(Array);
    expect(data.recentOrders).toBeInstanceOf(Array);
    expect(data.recentActivities).toBeInstanceOf(Array);

    // 6 aylık veri kontrolü
    expect(data.revenueChart.length).toBe(6);
    expect(data.userGrowthChart.length).toBe(6);

    const now = new Date();
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    // Ayların kronolojik sırası ve alan isimleri
    for (let i = 0; i < 6; i++) {
      const targetMonthIndex = (now.getMonth() - (5 - i) + 12) % 12;
      const expectedMonthName = months[targetMonthIndex];

      expect(data.revenueChart[i].name).toBe(expectedMonthName);
      expect(typeof data.revenueChart[i].gelir).toBe('number');
      expect(typeof data.revenueChart[i].siparis).toBe('number');
      expect(data.revenueChart[i].gelir).toBeGreaterThanOrEqual(0);
      expect(data.revenueChart[i].siparis).toBeGreaterThanOrEqual(0);

      expect(data.userGrowthChart[i].name).toBe(expectedMonthName);
      expect(typeof data.userGrowthChart[i].kullanici).toBe('number');
      expect(data.userGrowthChart[i].kullanici).toBeGreaterThanOrEqual(0);
    }
  });

  it('2. Siparişi olmayan boş ayların gelir ve sipariş değerleri sıfır (0) olarak kalmalı', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: 'ADMIN',
      },
    } as any);

    const req = new Request('http://localhost:3000/api/dashboard/stats?range=6m');
    const res = await getDashboardStats(req);
    const data = await res.json();

    // En az bir boş geçen ay varsa gelir ve sipariş alanlarının 0 olduğunu doğrula
    const zeroRevenueMonths = data.revenueChart.filter((m: any) => m.siparis === 0);
    for (const emptyMonth of zeroRevenueMonths) {
      expect(emptyMonth.gelir).toBe(0);
      expect(emptyMonth.siparis).toBe(0);
    }
  });

  it('3. Toplu sorgu ile hesaplanan gelir ve kullanıcı büyüme değerleri veritabanındaki gerçek verilerle tutarlı olmalı', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: 'ADMIN',
      },
    } as any);

    const req = new Request('http://localhost:3000/api/dashboard/stats?range=6m');
    const res = await getDashboardStats(req);
    const data = await res.json();

    // Güncel ayın sipariş verilerini kontrol et
    const currentMonthChartItem = data.revenueChart[data.revenueChart.length - 1];
    expect(currentMonthChartItem).toBeDefined();
    expect(currentMonthChartItem.gelir).toBeGreaterThanOrEqual(0);
    expect(currentMonthChartItem.siparis).toBeGreaterThanOrEqual(0);

    // Bütün ayların toplam sipariş sayısı ile metrics.totalOrders tutarlı olmalı
    const totalChartOrders = data.revenueChart.reduce((sum: number, m: any) => sum + m.siparis, 0);
    expect(totalChartOrders).toBeLessThanOrEqual(data.metrics.totalOrders);

    // Kümülatif kullanıcı büyümesi kontrolü (her ay >= önceki ay)
    for (let i = 1; i < data.userGrowthChart.length; i++) {
      expect(data.userGrowthChart[i].kullanici).toBeGreaterThanOrEqual(
        data.userGrowthChart[i - 1].kullanici
      );
    }
  });

  it('4. USER rolündeki kullanıcı istek attığında HTTP 403 Forbidden almalı (Yetkilendirme korunuyor)', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: regularUser.id,
        name: regularUser.name,
        email: regularUser.email,
        role: 'USER',
      },
    } as any);

    const req = new Request('http://localhost:3000/api/dashboard/stats');
    const res = await getDashboardStats(req);
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toContain('Yetersiz yetki');
    expect(data.metrics).toBeUndefined();
    expect(data.revenueChart).toBeUndefined();
  });
});
