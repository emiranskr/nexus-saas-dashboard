import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as nextAuth from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST as createOrder } from '@/app/api/orders/route';

// next-auth kütüphanesini mock'luyoruz
vi.mock('next-auth', async () => {
  const actual = await vi.importActual<typeof import('next-auth')>('next-auth');
  return {
    ...actual,
    getServerSession: vi.fn(),
  };
});

describe('Sipariş Oluşturma Rol ve Yetkilendirme Testleri (HIGH-04)', () => {
  let adminUser: any;
  let regularUser: any;
  let victimUser: any;
  let testCategory: any;
  let testProduct: any;

  beforeAll(async () => {
    adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const users = await prisma.user.findMany({ where: { role: 'USER' }, take: 2 });
    regularUser = users[0];
    victimUser = users[1] || users[0];

    testCategory = await prisma.category.findFirst();

    // İzole test ürünü oluştur
    testProduct = await prisma.product.create({
      data: {
        name: `RBAC Test Product ${Date.now()}`,
        sku: `RBAC-SKU-${Date.now()}`,
        price: 50,
        stock: 50,
        categoryId: testCategory.id,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({ where: { productId: testProduct.id } });
    await prisma.product.deleteMany({ where: { id: testProduct.id } });
  });

  it('1. Oturumsuz istek sipariş oluşturamamalı (HTTP 401 Unauthorized)', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: testProduct.id, quantity: 1 }],
      }),
    });

    const res = await createOrder(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Yetkisiz erişim');
  });

  it('2. USER rolündeki kullanıcı kendi adına sipariş oluşturabilmeli (HTTP 201 Created)', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: regularUser.id,
        role: 'USER',
        email: regularUser.email,
        name: regularUser.name,
      },
      expires: '2099-01-01',
    });

    // userId belirtilmeden (oturumdan otomatik alınarak)
    const req = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: testProduct.id, quantity: 2 }],
      }),
    });

    const res = await createOrder(req);
    expect(res.status).toBe(201);
    const order = await res.json();
    expect(order.userId).toBe(regularUser.id);
  });

  it('3. USER başka bir kullanıcı adına sipariş oluşturmaya çalıştığında reddedilmeli (HTTP 403 Forbidden)', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: regularUser.id,
        role: 'USER',
        email: regularUser.email,
        name: regularUser.name,
      },
      expires: '2099-01-01',
    });

    // Sahte/farklı bir userId gönderiliyor
    const req = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: victimUser.id === regularUser.id ? 'usr_different_target_id' : victimUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: testProduct.id, quantity: 1 }],
      }),
    });

    const res = await createOrder(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Yetersiz yetki');
  });

  it('4. ADMIN başka bir kullanıcı adına başarıyla sipariş oluşturabilmeli (HTTP 201 Created)', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: adminUser.id,
        role: 'ADMIN',
        email: adminUser.email,
        name: adminUser.name,
      },
      expires: '2099-01-01',
    });

    const req = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: regularUser.id,
        paymentMethod: 'BANK_TRANSFER',
        items: [{ productId: testProduct.id, quantity: 1 }],
      }),
    });

    const res = await createOrder(req);
    expect(res.status).toBe(201);
    const order = await res.json();
    expect(order.userId).toBe(regularUser.id);
  });

  it('5. ADMIN var olmayan bir kullanıcı ID belirttiğinde HTTP 404 almalı', async () => {
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: adminUser.id,
        role: 'ADMIN',
        email: adminUser.email,
        name: adminUser.name,
      },
      expires: '2099-01-01',
    });

    const req = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'non_existent_user_99999',
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: testProduct.id, quantity: 1 }],
      }),
    });

    const res = await createOrder(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('bulunamadı');
  });
});
