import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as nextAuth from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST as createOrder } from '@/app/api/orders/route';
import { PATCH as updateOrderStatus } from '@/app/api/orders/[id]/route';

// next-auth kütüphanesini admin kullanıcısı için mock'luyoruz
vi.mock('next-auth', async () => {
  const actual = await vi.importActual<typeof import('next-auth')>('next-auth');
  return {
    ...actual,
    getServerSession: vi.fn(),
  };
});

describe('Sipariş ve Stok Yaşam Döngüsü & Transaction Güvenliği (HIGH-03)', () => {
  let testAdminUser: any;
  let testCategory: any;
  let productA: any;
  let productB: any;

  beforeAll(async () => {
    testAdminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!testAdminUser) {
      testAdminUser = await prisma.user.create({
        data: {
          name: 'Admin Test',
          email: `admin_${Date.now()}@nexus.io`,
          passwordHash: 'dummy',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
    }

    // Admin mock'u gerçek veritabanındaki kullanıcı ID'si ile ayarlanmalı
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: {
        id: testAdminUser.id,
        role: 'ADMIN',
        email: testAdminUser.email,
        name: testAdminUser.name,
      },
      expires: '2099-01-01',
    });

    testCategory = await prisma.category.findFirst();

    // İzole test ürünleri oluştur
    const timestamp = Date.now();
    productA = await prisma.product.create({
      data: {
        name: `Test Product Alpha ${timestamp}`,
        sku: `TST-ALP-${timestamp}`,
        price: 100,
        stock: 20,
        categoryId: testCategory.id,
        status: 'ACTIVE',
      },
    });

    productB = await prisma.product.create({
      data: {
        name: `Test Product Beta ${timestamp}`,
        sku: `TST-BET-${timestamp}`,
        price: 200,
        stock: 10,
        categoryId: testCategory.id,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // Test verilerini temizle
    await prisma.orderItem.deleteMany({
      where: { productId: { in: [productA.id, productB.id] } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: [productA.id, productB.id] } },
    });
  });

  it('1. Sipariş oluşturulduğunda stok doğru miktarda azaltılmalı', async () => {
    const req = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testAdminUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: productA.id, quantity: 5 }],
      }),
    });

    const res = await createOrder(req);
    expect(res.status).toBe(201);
    const order = await res.json();
    expect(order.id).toBeDefined();

    // Stok 20 - 5 = 15 olmalı
    const currentProduct = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(currentProduct?.stock).toBe(15);
  });

  it('2. Sipariş CANCELLED durumuna geçtiğinde stoklar geri iade edilmeli', async () => {
    // Önce bir sipariş oluştur (4 adet Product A alsın -> stok 15 - 4 = 11)
    const createReq = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testAdminUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: productA.id, quantity: 4 }],
      }),
    });
    const order = await (await createOrder(createReq)).json();

    let p = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(p?.stock).toBe(11);

    // Siparişi CANCELLED yap
    const patchReq = new Request(`http://localhost:3000/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    const patchRes = await updateOrderStatus(patchReq, { params: { id: order.id } });
    expect(patchRes.status).toBe(200);

    // Stok geri 15'e iade edilmiş olmalı (11 + 4 = 15)
    p = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(p?.stock).toBe(15);
  });

  it('3. Aynı durum değişikliği tekrar gönderilirse stok ikinci kez değiştirilmemeli (Idempotence)', async () => {
    // Yeni bir sipariş oluştur (3 adet) -> stok 15 - 3 = 12
    const createReq = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testAdminUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: productA.id, quantity: 3 }],
      }),
    });
    const order = await (await createOrder(createReq)).json();

    // İptal et -> stok 12 + 3 = 15
    const patchReq1 = new Request(`http://localhost:3000/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    await updateOrderStatus(patchReq1, { params: { id: order.id } });

    // Tekrar CANCELLED gönder -> stok hâlâ 15 olmalı, 18 OLMAMALI!
    const patchReq2 = new Request(`http://localhost:3000/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    const res2 = await updateOrderStatus(patchReq2, { params: { id: order.id } });
    expect(res2.status).toBe(200);

    const p = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(p?.stock).toBe(15);
  });

  it('4. CANCELLED sipariş tekrar aktif bir duruma geçirildiğinde stok yeniden azaltılmalı', async () => {
    // Mevcut stok: 15
    // Sipariş (5 adet) oluştur -> stok 10
    const createReq = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testAdminUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: productA.id, quantity: 5 }],
      }),
    });
    const order = await (await createOrder(createReq)).json();

    // İptal et -> stok 15
    await updateOrderStatus(
      new Request(`http://localhost:3000/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      }),
      { params: { id: order.id } }
    );
    let p = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(p?.stock).toBe(15);

    // İptal edilmiş siparişi tekrar "PROCESSING" yap -> stok yeniden 10 olmalı!
    const reactivateRes = await updateOrderStatus(
      new Request(`http://localhost:3000/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESSING' }),
      }),
      { params: { id: order.id } }
    );
    expect(reactivateRes.status).toBe(200);

    p = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(p?.stock).toBe(10);
  });

  it('5. Yetersiz stok durumunda iptal edilmiş sipariş yeniden aktifleştirilememeli ve rollback olmalı', async () => {
    // Product A stoğu: 10
    // 6 adetlik sipariş oluştur -> stok 4
    const createReq = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testAdminUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: productA.id, quantity: 6 }],
      }),
    });
    const order = await (await createOrder(createReq)).json();

    // İptal et -> stok 10
    await updateOrderStatus(
      new Request(`http://localhost:3000/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      }),
      { params: { id: order.id } }
    );

    // Başka bir işlem araya girip stoğu 2 adede düşürsün
    await prisma.product.update({
      where: { id: productA.id },
      data: { stock: 2 },
    });

    // Şimdi 6 adet isteyen bu siparişi aktifleştirmeyi dene -> stok (2) yetersiz!
    const reactivateRes = await updateOrderStatus(
      new Request(`http://localhost:3000/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESSING' }),
      }),
      { params: { id: order.id } }
    );

    expect(reactivateRes.status).toBe(400);
    const errBody = await reactivateRes.json();
    expect(errBody.error).toContain('yetersiz stok');

    // Sipariş hâlâ CANCELLED kalmalı ve stok 2 olarak korunmalı
    const checkOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(checkOrder?.status).toBe('CANCELLED');

    const p = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(p?.stock).toBe(2);
  });

  it('6. Çok ürünlü siparişlerde transaction rollback: bir ürün yetersizse hiçbiri düşmemeli', async () => {
    // Product A stoğu: 20, Product B stoğu: 2 olsun
    await prisma.product.update({ where: { id: productA.id }, data: { stock: 20 } });
    await prisma.product.update({ where: { id: productB.id }, data: { stock: 2 } });

    // Sipariş: 5 adet Product A (yeterli) ve 5 adet Product B (YETERSİZ: elde 2 var)
    const createReq = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testAdminUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [
          { productId: productA.id, quantity: 5 },
          { productId: productB.id, quantity: 5 },
        ],
      }),
    });

    const res = await createOrder(createReq);
    expect(res.status).toBe(400);

    // ROLLBACK KONTROLÜ: Product A'nın da stoğu 20 olarak kalmalı, 15'e düşmemeli!
    const checkA = await prisma.product.findUnique({ where: { id: productA.id } });
    const checkB = await prisma.product.findUnique({ where: { id: productB.id } });
    expect(checkA?.stock).toBe(20);
    expect(checkB?.stock).toBe(2);
  });

  it('7. Eşzamanlı siparişlerde negatif stok oluşumu önlenmeli', async () => {
    // Product A stoğunu 5 yapalım
    await prisma.product.update({ where: { id: productA.id }, data: { stock: 5 } });

    // Aynı anda iki ayrı kullanıcı 4'er adet satın almaya çalışsın (Toplam 8 > 5)
    const req1 = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testAdminUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: productA.id, quantity: 4 }],
      }),
    });

    const req2 = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testAdminUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: productA.id, quantity: 4 }],
      }),
    });

    // İki isteği eşzamanlı çalıştır
    const [res1, res2] = await Promise.all([createOrder(req1), createOrder(req2)]);

    const statuses = [res1.status, res2.status].sort();
    // Biri başarılı (201), diğeri yetersiz stoktan hatalı (400) olmalı
    expect(statuses).toEqual([201, 400]);

    // Kalan stok kesinlikle pozitif veya 0 olmalı (5 - 4 = 1), ASLA -3 olamaz!
    const finalProduct = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(finalProduct?.stock).toBe(1);
    expect(finalProduct?.stock).toBeGreaterThanOrEqual(0);
  });

  it('8. Aynı siparişte aynı ürün birden fazla kalem olarak geldiğinde toplam miktar üzerinden stok yönetilmeli', async () => {
    // Product A stoğu: 10
    await prisma.product.update({ where: { id: productA.id }, data: { stock: 10 } });

    // Sipariş: Aynı ürün için 4 adet ve 3 adet (Toplam: 7 adet)
    const createReq = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testAdminUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [
          { productId: productA.id, quantity: 4 },
          { productId: productA.id, quantity: 3 },
        ],
      }),
    });

    const res = await createOrder(createReq);
    expect(res.status).toBe(201);
    const order = await res.json();

    // Stok: 10 - 7 = 3 olmalı
    let p = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(p?.stock).toBe(3);

    // Siparişi iptal et -> Stok: 3 + 7 = 10 olmalı
    const cancelRes = await updateOrderStatus(
      new Request(`http://localhost:3000/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      }),
      { params: { id: order.id } }
    );
    expect(cancelRes.status).toBe(200);

    p = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(p?.stock).toBe(10);

    // Siparişi tekrar aktifleştir -> Stok: 10 - 7 = 3 olmalı
    const reactivateRes = await updateOrderStatus(
      new Request(`http://localhost:3000/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESSING' }),
      }),
      { params: { id: order.id } }
    );
    expect(reactivateRes.status).toBe(200);

    p = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(p?.stock).toBe(3);
  });

  it('9. İki eşzamanlı PATCH iptal isteğinde çift stok iadesi engellenmeli (Race Condition Koruması)', async () => {
    // Product A stoğu: 10
    await prisma.product.update({ where: { id: productA.id }, data: { stock: 10 } });

    // Sipariş: 4 adet Product A al -> Stok: 6
    const createReq = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testAdminUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: productA.id, quantity: 4 }],
      }),
    });
    const order = await (await createOrder(createReq)).json();

    let p = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(p?.stock).toBe(6);

    // İki ayrı istek aynı anda bu siparişi CANCELLED yapmaya çalışsın
    const patchReq1 = new Request(`http://localhost:3000/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    const patchReq2 = new Request(`http://localhost:3000/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });

    const [res1, res2] = await Promise.all([
      updateOrderStatus(patchReq1, { params: { id: order.id } }),
      updateOrderStatus(patchReq2, { params: { id: order.id } }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    // Mükerrer stok iadesi OLMAMALI: Stok 10 olmalı, 14 (6 + 4 + 4) ASLA OLMAMALI!
    p = await prisma.product.findUnique({ where: { id: productA.id } });
    expect(p?.stock).toBe(10);
  });

  it('10. Geçersiz durum geçişi engellenmeli (COMPLETED -> PROCESSING/PENDING)', async () => {
    // Sipariş oluştur
    const createReq = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testAdminUser.id,
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: productA.id, quantity: 1 }],
      }),
    });
    const order = await (await createOrder(createReq)).json();

    // Siparişi COMPLETED yap
    const completeRes = await updateOrderStatus(
      new Request(`http://localhost:3000/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      }),
      { params: { id: order.id } }
    );
    expect(completeRes.status).toBe(200);

    // COMPLETED bir siparişi PROCESSING yapmayı dene -> HATA (400)
    const invalidRes = await updateOrderStatus(
      new Request(`http://localhost:3000/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESSING' }),
      }),
      { params: { id: order.id } }
    );

    expect(invalidRes.status).toBe(400);
    const errBody = await invalidRes.json();
    expect(errBody.error).toContain('geriye dönük');
  });
});
