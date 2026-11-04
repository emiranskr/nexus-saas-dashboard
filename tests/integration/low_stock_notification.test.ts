import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as nextAuth from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST as createOrder } from '@/app/api/orders/route';
import { notifyAdminsLowStock, LOW_STOCK_THRESHOLD } from '@/lib/notifications';

// NextAuth mock
vi.mock('next-auth', async () => {
  const actual = await vi.importActual<typeof import('next-auth')>('next-auth');
  return {
    ...actual,
    getServerSession: vi.fn(),
  };
});

describe('Düşük Stok Bildirimi Yönlendirme ve Güvenlik Testleri (MED-01)', () => {
  let admin1: any;
  let admin2: any;
  let regularUser: any;
  let testCategory: any;
  let createdProductIds: string[] = [];
  let createdUserIds: string[] = [];
  let createdOrderIds: string[] = [];

  beforeAll(async () => {
    // Mevcut bir admin ve standart kullanıcı bul
    admin1 = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    regularUser = await prisma.user.findFirst({ where: { role: 'USER' } });
    testCategory = await prisma.category.findFirst();

    // İkinci bir ADMIN kullanıcısı oluştur (çoklu yönetici testleri için)
    admin2 = await prisma.user.create({
      data: {
        name: `Admin Two ${Date.now()}`,
        email: `admin2_${Date.now()}@nexus.io`,
        passwordHash: 'hashed_password_placeholder',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(admin2.id);
  });

  afterAll(async () => {
    // Test verilerini temizle
    if (createdOrderIds.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    }
    if (createdProductIds.length > 0) {
      await prisma.notification.deleteMany({
        where: {
          type: 'STOCK',
        },
      });
      await prisma.orderItem.deleteMany({ where: { productId: { in: createdProductIds } } });
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it('1. USER rolündeki müşteri sipariş verdiğinde ve stok <= 5 olduğunda müşteriye ASLA düşük stok bildirimi gitmemeli', async () => {
    // 7 stoklu ürün oluştur (3 adet sipariş verilince 4 kalacak <= 5)
    const product = await prisma.product.create({
      data: {
        name: `Stock Alert Item Alpha ${Date.now()}`,
        sku: `SKU-ALPHA-${Date.now()}`,
        price: 100,
        stock: 7,
        categoryId: testCategory.id,
        status: 'ACTIVE',
      },
    });
    createdProductIds.push(product.id);

    // Müşteri oturum açmış gibi mock'la
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: regularUser.id,
        email: regularUser.email,
        name: regularUser.name,
        role: 'USER',
      },
    } as any);

    const req = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product.id, quantity: 3 }],
        paymentMethod: 'CREDIT_CARD',
      }),
    });

    const res = await createOrder(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    createdOrderIds.push(data.id);

    // Kalan stok 4 olmalı
    const updatedProd = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProd?.stock).toBe(4);

    // Müşterinin bildirimlerini kontrol et:
    // Müşteriye sadece 'ORDER' bildirimi gitmeli, 'STOCK' bildirimi gitmemeli!
    const userStockNotifications = await prisma.notification.findMany({
      where: {
        userId: regularUser.id,
        type: 'STOCK',
        message: { contains: product.name },
      },
    });
    expect(userStockNotifications.length).toBe(0);

    const userOrderNotifications = await prisma.notification.findMany({
      where: {
        userId: regularUser.id,
        type: 'ORDER',
        message: { contains: data.orderNumber },
      },
    });
    expect(userOrderNotifications.length).toBeGreaterThanOrEqual(1);
  });

  it('2. Stok kritik seviyeye indiğinde sistemdeki yöneticilere (ADMIN) düşük stok bildirimi gitmeli', async () => {
    const product = await prisma.product.findFirst({
      where: { id: createdProductIds[0] },
    });
    expect(product).toBeDefined();

    // admin1 için bildirim oluşmuş mu?
    const admin1Notifications = await prisma.notification.findMany({
      where: {
        userId: admin1.id,
        type: 'STOCK',
        message: { contains: product!.name },
      },
    });
    expect(admin1Notifications.length).toBe(1);
    expect(admin1Notifications[0].title).toBe('Kritik Stok Uyarısı');
    expect(admin1Notifications[0].message).toContain('son 4 adet kaldı');
  });

  it('3. Birden fazla yönetici varsa bildirim istisnasız TÜM yöneticilere gitmeli', async () => {
    const product = await prisma.product.findFirst({
      where: { id: createdProductIds[0] },
    });

    // admin2 için de bildirim oluşmuş olmalı
    const admin2Notifications = await prisma.notification.findMany({
      where: {
        userId: admin2.id,
        type: 'STOCK',
        message: { contains: product!.name },
      },
    });
    expect(admin2Notifications.length).toBe(1);
    expect(admin2Notifications[0].title).toBe('Kritik Stok Uyarısı');
  });

  it('4. Aynı ürün için zaten okunmamış bir bildirim varken mükerrer bildirim oluşturulmamalı', async () => {
    const product = await prisma.product.findFirst({
      where: { id: createdProductIds[0] },
    });

    // admin1'in mevcut bildirim sayısı
    const countBefore = await prisma.notification.count({
      where: {
        userId: admin1.id,
        type: 'STOCK',
        message: { contains: product!.name },
      },
    });

    // Bir kez daha stok uyarısı fonksiyonunu tetikle
    await notifyAdminsLowStock(prisma, {
      id: product!.id,
      name: product!.name,
      stock: 2,
    });

    const countAfter = await prisma.notification.count({
      where: {
        userId: admin1.id,
        type: 'STOCK',
        message: { contains: product!.name },
      },
    });

    // Zaten okunmamış bildirim olduğu için sayı artmamalı
    expect(countAfter).toBe(countBefore);
  });

  it('5. Sistemde hiç yönetici bulunamazsa uygulama hata vermeden güvenli şekilde devam etmeli', async () => {
    // Mock prisma client with no admins
    const mockPrismaClient: any = {
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      notification: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    await expect(
      notifyAdminsLowStock(mockPrismaClient, {
        id: 'fake-prod-id',
        name: 'Ghost Item',
        stock: 3,
      })
    ).resolves.not.toThrow();

    expect(mockPrismaClient.notification.create).not.toHaveBeenCalled();
  });

  it('6. Stok eşik değeri (LOW_STOCK_THRESHOLD = 5) üzerindeki ürünler için bildirim gönderilmemeli', async () => {
    const mockPrismaClient: any = {
      user: { findMany: vi.fn() },
      notification: { create: vi.fn() },
    };

    await notifyAdminsLowStock(mockPrismaClient, {
      name: 'High Stock Product',
      stock: 6,
    });

    expect(mockPrismaClient.user.findMany).not.toHaveBeenCalled();
    expect(mockPrismaClient.notification.create).not.toHaveBeenCalled();
  });
});
