import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAuthSecret } from '../../src/lib/auth';

describe('MED-05: NEXTAUTH_SECRET Configuration & Security Enforcement', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Production Environment (NODE_ENV=production)', () => {
    beforeEach(() => {
      // Vitest allows overriding NODE_ENV
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    });

    it('NEXTAUTH_SECRET tanımlı değilse uygulama başlatma hatası fırlatmalı', () => {
      delete process.env.NEXTAUTH_SECRET;

      expect(() => getAuthSecret()).toThrowError(
        /FATAL CONFIGURATION ERROR: NEXTAUTH_SECRET is required in production/
      );
    });

    it('NEXTAUTH_SECRET boş string ise hata fırlatmalı', () => {
      process.env.NEXTAUTH_SECRET = '   ';

      expect(() => getAuthSecret()).toThrowError(
        /FATAL CONFIGURATION ERROR: NEXTAUTH_SECRET is required in production/
      );
    });

    it('NEXTAUTH_SECRET 32 karakterden kısa ise güvenlik hatası fırlatmalı', () => {
      process.env.NEXTAUTH_SECRET = 'too-short-secret';

      expect(() => getAuthSecret()).toThrowError(
        /FATAL CONFIGURATION ERROR: NEXTAUTH_SECRET must be at least 32 characters long/
      );
    });

    it('NEXTAUTH_SECRET şablon/placeholder değeri taşıyorsa hata fırlatmalı', () => {
      process.env.NEXTAUTH_SECRET = 'your-32-character-secret-key-here';

      expect(() => getAuthSecret()).toThrowError(
        /FATAL CONFIGURATION ERROR: Insecure placeholder detected for NEXTAUTH_SECRET/
      );
    });

    it('NEXTAUTH_SECRET en az 32 karakterlik geçerli bir anahtar ise başarıyla dönmeli', () => {
      const validSecret = 'super-strong-production-secret-key-with-64-characters-entropy-12345';
      process.env.NEXTAUTH_SECRET = validSecret;

      expect(getAuthSecret()).toBe(validSecret);
    });
  });

  describe('Development & Test Environment (NODE_ENV != production)', () => {
    it('Development ortamında NEXTAUTH_SECRET yoksa güvenli fallback dönmeli ve hata vermemeli', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      delete process.env.NEXTAUTH_SECRET;

      expect(() => getAuthSecret()).not.toThrow();
      const secret = getAuthSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });

    it('Development ortamında özel NEXTAUTH_SECRET tanımlıysa onu dönmeli', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'custom-dev-secret-1234';

      expect(getAuthSecret()).toBe('custom-dev-secret-1234');
    });

    it('Test ortamında NEXTAUTH_SECRET yoksa geliştirici/test deneyimini bozmadan çalışmalı', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
      delete process.env.NEXTAUTH_SECRET;

      expect(() => getAuthSecret()).not.toThrow();
      expect(getAuthSecret()).toBe('nexus-dev-super-secret-key-min-32-chars-long!');
    });
  });
});
