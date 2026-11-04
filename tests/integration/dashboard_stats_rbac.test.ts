import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/dashboard/stats/route';
import * as nextAuth from 'next-auth';

// next-auth kütüphanesini mock'layarak oturum senaryolarını test ediyoruz
vi.mock('next-auth', async () => {
  const actual = await vi.importActual<typeof import('next-auth')>('next-auth');
  return {
    ...actual,
    getServerSession: vi.fn(),
  };
});

describe('Dashboard Stats API RBAC & Güvenlik Testleri (CRIT-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Oturumu olmayan (unauthenticated) istek HTTP 401 almalı', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost:3000/api/dashboard/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain('Yetkisiz erişim');
    expect(body.metrics).toBeUndefined();
    expect(body.recentOrders).toBeUndefined();
  });

  it('2. USER rolündeki kullanıcı istek attığında HTTP 403 Forbidden almalı ve veri sızmamalı', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: 'usr_regular_123',
        name: 'Normal Kullanici',
        email: 'user@nexus.io',
        role: 'USER',
        status: 'ACTIVE',
      },
      expires: '2099-01-01',
    });

    const req = new Request('http://localhost:3000/api/dashboard/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Yetersiz yetki');
    expect(body.metrics).toBeUndefined();
    expect(body.recentOrders).toBeUndefined();
    expect(body.recentActivities).toBeUndefined();
  });

  it('3. ADMIN rolündeki kullanıcı istek attığında HTTP 200 ve tam metrikleri almalı', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: 'usr_admin_123',
        name: 'Nexus Admin',
        email: 'admin@nexus.io',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      expires: '2099-01-01',
    });

    const req = new Request('http://localhost:3000/api/dashboard/stats?range=30d');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.metrics).toBeDefined();
    expect(body.metrics.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(body.revenueChart).toBeInstanceOf(Array);
    expect(body.userGrowthChart).toBeInstanceOf(Array);
    expect(body.recentOrders).toBeInstanceOf(Array);
    expect(body.recentActivities).toBeInstanceOf(Array);
  });
});
