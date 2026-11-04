import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as nextAuth from 'next-auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { GET as getUsers } from '@/app/api/users/route';
import { POST as createProduct } from '@/app/api/products/route';
import { GET as getReports } from '@/app/api/reports/route';
import { GET as getCategories } from '@/app/api/categories/route';

// next-auth kütüphanesini mock'layarak oturum senaryolarını test ediyoruz
vi.mock('next-auth', async () => {
  const actual = await vi.importActual<typeof import('next-auth')>('next-auth');
  return {
    ...actual,
    getServerSession: vi.fn(),
  };
});

describe('Merkezi API Hata Yönetimi & HTTP Durum Kodu Testleri (HIGH-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleApiError Birim Testleri', () => {
    it('1. UnauthorizedError verildiğinde HTTP 401 dönmeli', async () => {
      const err = new UnauthorizedError('Yetkisiz erişim: Lütfen giriş yapınız.');
      const res = handleApiError(err);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Yetkisiz erişim: Lütfen giriş yapınız.');
    });

    it('2. ForbiddenError verildiğinde HTTP 403 dönmeli', async () => {
      const err = new ForbiddenError('Yetersiz yetki: Bu işlem için Yönetici (Admin) rolü gereklidir.');
      const res = handleApiError(err);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Yetersiz yetki: Bu işlem için Yönetici (Admin) rolü gereklidir.');
    });

    it('3. Beklenmeyen bir sunucu hatası verildiğinde HTTP 500 dönmeli', async () => {
      const err = new Error('Database connection timeout error');
      const res = handleApiError(err, 'Sunucu hatası oluştu');
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Sunucu hatası oluştu');
    });

    it('4. String hata fırlatıldığında da doğru ele alınmalı', async () => {
      const res = handleApiError('Yetkisiz erişim tespit edildi');
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Yetkisiz erişim');
    });
  });

  describe('Korumalı API Rotaları Entegrasyon Testleri', () => {
    it('GET /api/users: Oturum açmamış istek HTTP 401 almalı (Önceden 500 alıyordu)', async () => {
      vi.mocked(nextAuth.getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/users');
      const res = await getUsers(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Yetkisiz erişim');
    });

    it('GET /api/users: USER rolü HTTP 403 Forbidden almalı', async () => {
      vi.mocked(nextAuth.getServerSession).mockResolvedValue({
        user: { id: 'usr-1', role: 'USER', email: 'user@nexus.io' },
        expires: '2099-01-01',
      });

      const req = new Request('http://localhost:3000/api/users');
      const res = await getUsers(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Yetersiz yetki');
    });

    it('POST /api/products: Oturum açmamış istek HTTP 401 almalı', async () => {
      vi.mocked(nextAuth.getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const res = await createProduct(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Yetkisiz erişim');
    });

    it('POST /api/products: USER rolü HTTP 403 almalı', async () => {
      vi.mocked(nextAuth.getServerSession).mockResolvedValue({
        user: { id: 'usr-1', role: 'USER', email: 'user@nexus.io' },
        expires: '2099-01-01',
      });

      const req = new Request('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const res = await createProduct(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Yetersiz yetki');
    });

    it('GET /api/reports: Oturum açmamış istek HTTP 401, USER rolü HTTP 403 almalı', async () => {
      // 1. Oturumsuz
      vi.mocked(nextAuth.getServerSession).mockResolvedValue(null);
      const resUnauth = await getReports(new Request('http://localhost:3000/api/reports'));
      expect(resUnauth.status).toBe(401);

      // 2. Standart kullanıcı
      vi.mocked(nextAuth.getServerSession).mockResolvedValue({
        user: { id: 'usr-1', role: 'USER', email: 'user@nexus.io' },
        expires: '2099-01-01',
      });
      const resUser = await getReports(new Request('http://localhost:3000/api/reports'));
      expect(resUser.status).toBe(403);
    });

    it('GET /api/categories: Oturum açmamış istek HTTP 401 almalı (Önceden 500 alıyordu)', async () => {
      vi.mocked(nextAuth.getServerSession).mockResolvedValue(null);

      const res = await getCategories();
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Yetkisiz erişim');
    });
  });
});
