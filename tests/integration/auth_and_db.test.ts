import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Veritabanı ve Kimlik Doğrulama Entegrasyon Testleri', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Şifre Güvenliği ve Hashleme', () => {
    it('Bcrypt ile şifreyi güvenli hashlemeli ve doğru doğrulamalı', async () => {
      const rawPassword = 'SecurePassword2026!';
      const hash = await bcrypt.hash(rawPassword, 10);

      expect(hash).not.toBe(rawPassword);
      expect(hash.startsWith('$2')).toBe(true);

      const isMatch = await bcrypt.compare(rawPassword, hash);
      expect(isMatch).toBe(true);

      const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
      expect(isWrongMatch).toBe(false);
    });
  });

  describe('Veritabanı Kullanıcı ve Rol Modeli', () => {
    it('Seed edilen admin kullanıcısını veritabanından başarıyla sorgulamalı', async () => {
      const admin = await prisma.user.findUnique({
        where: { email: 'admin@nexus.io' },
      });

      expect(admin).not.toBeNull();
      expect(admin?.role).toBe('ADMIN');
      expect(admin?.status).toBe('ACTIVE');
    });

    it('Seed edilen standart kullanıcıyı sorgulamalı', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'user@nexus.io' },
      });

      expect(user).not.toBeNull();
      expect(user?.role).toBe('USER');
    });
  });

  describe('Ürün Kataloğu ve Stok', () => {
    it('Kategorilerle ilişkili ürünleri sorgulamalı', async () => {
      const products = await prisma.product.findMany({
        include: { category: true },
      });

      expect(products.length).toBeGreaterThan(0);
      expect(products[0].category).toBeDefined();
      expect(products[0].category.name).toBeTruthy();
    });

    it('Tüm ürünlerin fiyatı 0 dan büyük olmalı', async () => {
      const products = await prisma.product.findMany();
      for (const p of products) {
        expect(p.price).toBeGreaterThan(0);
        expect(p.stock).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Sipariş ve İlişkisel Bütünlük', () => {
    it('Siparişlerin kalemleri ve kullanıcıları ilişkili olmalı', async () => {
      const orders = await prisma.order.findMany({
        take: 5,
        include: {
          user: true,
          items: { include: { product: true } },
        },
      });

      expect(orders.length).toBeGreaterThan(0);
      for (const order of orders) {
        expect(order.orderNumber).toMatch(/^ORD-/);
        expect(order.user).toBeDefined();
        expect(order.totalAmount).toBeGreaterThan(0);
        expect(order.items.length).toBeGreaterThan(0);
      }
    });
  });
});
