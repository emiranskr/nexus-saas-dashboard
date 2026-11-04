import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as nextAuth from 'next-auth';
import { prisma } from '@/lib/prisma';
import { handleMiddleware } from '@/middleware';
import { GET as getUsers } from '@/app/api/users/route';
import { GET as getReports } from '@/app/api/reports/route';
import { AccessDenied } from '@/components/ui/AccessDenied';

// NextAuth mock
vi.mock('next-auth', async () => {
  const actual = await vi.importActual<typeof import('next-auth')>('next-auth');
  return {
    ...actual,
    getServerSession: vi.fn(),
  };
});

function createMockRequest(pathname: string, token: any = null) {
  const url = `http://localhost:3000${pathname}`;
  return {
    url,
    nextUrl: new URL(url),
    nextauth: { token },
  };
}

describe('MED-04: Users ve Reports Sayfaları Yetki Kontrolü & Erişim Koruması Testleri', () => {
  let adminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    regularUser = await prisma.user.findFirst({ where: { role: 'USER' } });
  });

  describe('1. Middleware Yönlendirme Güvenliği (Sayfa Erişimi)', () => {
    it('USER rolündeki kullanıcı /dashboard/users sayfasına erişmeye çalıştığında /dashboard adresine yönlendirilmeli', () => {
      const req = createMockRequest('/dashboard/users', {
        id: regularUser.id,
        email: regularUser.email,
        role: 'USER',
      });

      const res = handleMiddleware(req as any);
      expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
    });

    it('USER rolündeki kullanıcı /dashboard/reports sayfasına erişmeye çalıştığında /dashboard adresine yönlendirilmeli', () => {
      const req = createMockRequest('/dashboard/reports', {
        id: regularUser.id,
        email: regularUser.email,
        role: 'USER',
      });

      const res = handleMiddleware(req as any);
      expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
    });

    it('ADMIN rolündeki kullanıcı her iki sayfaya da doğrudan erişebilmeli', () => {
      const reqUsers = createMockRequest('/dashboard/users', {
        id: adminUser.id,
        email: adminUser.email,
        role: 'ADMIN',
      });
      const resUsers = handleMiddleware(reqUsers as any);
      expect(resUsers.headers.get('location')).toBeNull();

      const reqReports = createMockRequest('/dashboard/reports', {
        id: adminUser.id,
        email: adminUser.email,
        role: 'ADMIN',
      });
      const resReports = handleMiddleware(reqReports as any);
      expect(resReports.headers.get('location')).toBeNull();
    });
  });

  describe('2. Backend API Güvenliği (Hassas Veri İzolasyonu)', () => {
    it('Oturumsuz istek /api/users endpointinden HTTP 401 Unauthorized almalı', async () => {
      vi.mocked(nextAuth.getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/users');
      const res = await getUsers(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toContain('Yetkisiz');
    });

    it('USER rolü /api/users endpointinden HTTP 403 Forbidden almalı ve kullanıcı listesini görememeli', async () => {
      vi.mocked(nextAuth.getServerSession).mockResolvedValue({
        user: {
          id: regularUser.id,
          name: regularUser.name,
          email: regularUser.email,
          role: 'USER',
        },
      } as any);

      const req = new Request('http://localhost:3000/api/users');
      const res = await getUsers(req);
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.error).toContain('Yetersiz yetki');
      expect(body.data).toBeUndefined();
    });

    it('ADMIN rolü /api/users endpointinden HTTP 200 ile verileri alabilmeli', async () => {
      vi.mocked(nextAuth.getServerSession).mockResolvedValue({
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: 'ADMIN',
        },
      } as any);

      const req = new Request('http://localhost:3000/api/users?page=1&limit=5');
      const res = await getUsers(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.pagination).toBeDefined();
    });

    it('Oturumsuz istek /api/reports endpointinden HTTP 401 Unauthorized almalı', async () => {
      vi.mocked(nextAuth.getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/reports?days=30');
      const res = await getReports(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toContain('Yetkisiz');
    });

    it('USER rolü /api/reports endpointinden HTTP 403 Forbidden almalı ve finansal verileri görememeli', async () => {
      vi.mocked(nextAuth.getServerSession).mockResolvedValue({
        user: {
          id: regularUser.id,
          name: regularUser.name,
          email: regularUser.email,
          role: 'USER',
        },
      } as any);

      const req = new Request('http://localhost:3000/api/reports?days=30');
      const res = await getReports(req);
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.error).toContain('Yetersiz yetki');
      expect(body.summary).toBeUndefined();
    });

    it('ADMIN rolü /api/reports endpointinden HTTP 200 ile finansal raporları alabilmeli', async () => {
      vi.mocked(nextAuth.getServerSession).mockResolvedValue({
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: 'ADMIN',
        },
      } as any);

      const req = new Request('http://localhost:3000/api/reports?days=30');
      const res = await getReports(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.summary).toBeDefined();
      expect(body.topProducts).toBeDefined();
    });
  });

  describe('3. AccessDenied Bileşeni Doğrulaması', () => {
    it('AccessDenied bileşeni fonksiyon olarak tanımlı ve çağrılabilir olmalı', () => {
      expect(typeof AccessDenied).toBe('function');
      const element = AccessDenied({
        pageName: 'Test Sayfası',
        title: 'Özel Başlık',
        description: 'Test Açıklaması',
      });
      expect(element).toBeDefined();
      expect(element.type).toBe('div');
    });
  });
});
