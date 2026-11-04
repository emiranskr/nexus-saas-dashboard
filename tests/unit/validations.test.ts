import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  productSchema,
  createOrderSchema,
  changePasswordSchema,
} from '../../src/lib/validations';

describe('Zod Validasyon Şemaları Testleri', () => {
  describe('registerSchema', () => {
    it('Geçerli kullanıcı bilgilerini başarıyla onaylamalı', () => {
      const valid = registerSchema.safeParse({
        name: 'Ahmet Yılmaz',
        email: 'ahmet@example.com',
        password: 'Password123',
      });
      expect(valid.success).toBe(true);
    });

    it('Yetersiz uzunlukta şifreyi reddetmeli', () => {
      const invalid = registerSchema.safeParse({
        name: 'Ahmet',
        email: 'ahmet@example.com',
        password: 'Pass1', // < 8 karakter
      });
      expect(invalid.success).toBe(false);
    });

    it('Büyük harf içermeyen şifreyi reddetmeli', () => {
      const invalid = registerSchema.safeParse({
        name: 'Ahmet',
        email: 'ahmet@example.com',
        password: 'password123',
      });
      expect(invalid.success).toBe(false);
    });

    it('Rakam içermeyen şifreyi reddetmeli', () => {
      const invalid = registerSchema.safeParse({
        name: 'Ahmet',
        email: 'ahmet@example.com',
        password: 'PasswordXYZ',
      });
      expect(invalid.success).toBe(false);
    });

    it('Geçersiz e-posta adresini reddetmeli', () => {
      const invalid = registerSchema.safeParse({
        name: 'Ahmet',
        email: 'gecersiz-eposta',
        password: 'Password123',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('Geçerli giriş bilgilerini onaylamalı', () => {
      const valid = loginSchema.safeParse({
        email: 'user@nexus.io',
        password: 'SecretPassword',
      });
      expect(valid.success).toBe(true);
    });

    it('Boş şifreyi reddetmeli', () => {
      const invalid = loginSchema.safeParse({
        email: 'user@nexus.io',
        password: '',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('productSchema', () => {
    it('Geçerli ürün bilgilerini onaylamalı', () => {
      const valid = productSchema.safeParse({
        name: 'Nexus Core Engine',
        sku: 'NXS-CORE-01',
        price: 4999.5,
        stock: 50,
        categoryId: 'cat_123',
        status: 'ACTIVE',
      });
      expect(valid.success).toBe(true);
    });

    it('Negatif fiyatı reddetmeli', () => {
      const invalid = productSchema.safeParse({
        name: 'Test',
        sku: 'SKU123',
        price: -50,
        stock: 10,
        categoryId: 'cat_1',
      });
      expect(invalid.success).toBe(false);
    });

    it('Negatif stok miktarını reddetmeli', () => {
      const invalid = productSchema.safeParse({
        name: 'Test',
        sku: 'SKU123',
        price: 100,
        stock: -1,
        categoryId: 'cat_1',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('createOrderSchema', () => {
    it('En az 1 ürün içeren siparişi onaylamalı', () => {
      const valid = createOrderSchema.safeParse({
        userId: 'usr_123',
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: 'prod_1', quantity: 2 }],
      });
      expect(valid.success).toBe(true);
    });

    it('Boş ürün listeli siparişi reddetmeli', () => {
      const invalid = createOrderSchema.safeParse({
        userId: 'usr_123',
        paymentMethod: 'CREDIT_CARD',
        items: [],
      });
      expect(invalid.success).toBe(false);
    });
  });
});
