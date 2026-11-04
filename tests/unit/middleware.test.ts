import { describe, it, expect } from 'vitest';
import { handleMiddleware } from '@/middleware';
import { NextResponse } from 'next/server';

function createMockRequest(pathname: string, token: any = null) {
  const url = `http://localhost:3000${pathname}`;
  return {
    url,
    nextUrl: new URL(url),
    nextauth: { token },
  };
}

describe('Middleware Rol Tabanlı Rota Güvenliği Testleri (HIGH-01)', () => {
  describe('ADMIN Özel Sayfalar (/dashboard/users & /dashboard/reports)', () => {
    it('USER rolündeki kullanıcı /dashboard/users sayfasına erişmeye çalışırsa /dashboard adresine yönlendirilmeli', () => {
      const req = createMockRequest('/dashboard/users', {
        id: 'user-1',
        email: 'user@nexus.io',
        role: 'USER',
      });

      const response = handleMiddleware(req as any);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
    });

    it('USER rolündeki kullanıcı /dashboard/reports sayfasına erişmeye çalışırsa /dashboard adresine yönlendirilmeli', () => {
      const req = createMockRequest('/dashboard/reports', {
        id: 'user-1',
        email: 'user@nexus.io',
        role: 'USER',
      });

      const response = handleMiddleware(req as any);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
    });

    it('ADMIN rolündeki kullanıcı /dashboard/users sayfasına eriştiğinde geçişe izin verilmeli', () => {
      const req = createMockRequest('/dashboard/users', {
        id: 'admin-1',
        email: 'admin@nexus.io',
        role: 'ADMIN',
      });

      const response = handleMiddleware(req as any);

      // NextResponse.next() redirect header içermez
      expect(response.headers.get('location')).toBeNull();
    });

    it('ADMIN rolündeki kullanıcı /dashboard/reports sayfasına eriştiğinde geçişe izin verilmeli', () => {
      const req = createMockRequest('/dashboard/reports', {
        id: 'admin-1',
        email: 'admin@nexus.io',
        role: 'ADMIN',
      });

      const response = handleMiddleware(req as any);

      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('Genel Dashboard Sayfaları (Tüm Oturum Açmış Kullanıcılar)', () => {
    it('USER rolü /dashboard ana sayfasına sorunsuz erişebilmeli', () => {
      const req = createMockRequest('/dashboard', {
        id: 'user-1',
        role: 'USER',
      });

      const response = handleMiddleware(req as any);
      expect(response.headers.get('location')).toBeNull();
    });

    it('USER rolü /dashboard/products sayfasına sorunsuz erişebilmeli', () => {
      const req = createMockRequest('/dashboard/products', {
        id: 'user-1',
        role: 'USER',
      });

      const response = handleMiddleware(req as any);
      expect(response.headers.get('location')).toBeNull();
    });

    it('USER rolü /dashboard/orders sayfasına sorunsuz erişebilmeli', () => {
      const req = createMockRequest('/dashboard/orders', {
        id: 'user-1',
        role: 'USER',
      });

      const response = handleMiddleware(req as any);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('Auth Sayfaları Yönlendirmeleri (/login & /register)', () => {
    it('Oturum açmış kullanıcı /login sayfasına giderse /dashboard adresine yönlendirilmeli', () => {
      const req = createMockRequest('/login', {
        id: 'user-1',
        role: 'USER',
      });

      const response = handleMiddleware(req as any);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
    });

    it('Oturumsuz kullanıcı /login sayfasına eriştiğinde yönlendirme yapılmamalı (null dönmeli)', () => {
      const req = createMockRequest('/login', null);

      const response = handleMiddleware(req as any);
      expect(response).toBeNull();
    });
  });
});
