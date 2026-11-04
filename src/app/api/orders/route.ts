import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, AuthError } from '@/lib/auth';
import { createOrderSchema } from '@/lib/validations';
import { notifyAdminsLowStock } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Standart kullanıcı yalnızca kendi siparişlerini görür
    if (user.role !== 'ADMIN') {
      where.userId = user.id;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, 'Siparişler yüklenemedi');
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAuth();
    const body = await req.json();

    const validated = createOrderSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validasyon hatası', details: validated.error.format() },
        { status: 400 }
      );
    }

    const { userId, paymentMethod, items } = validated.data;

    let targetUserId: string;

    // Yetkilendirme ve Kullanıcı Kimliği Belirleme (HIGH-04 Çözümü)
    if (currentUser.role === 'ADMIN') {
      // Admin başka bir kullanıcı adına veya kendi adına sipariş verebilir
      if (userId && userId !== currentUser.id) {
        const targetUserExists = await prisma.user.findUnique({
          where: { id: userId },
        });
        if (!targetUserExists) {
          return NextResponse.json(
            { error: 'Seçilen müşteri veritabanında bulunamadı.' },
            { status: 404 }
          );
        }
        targetUserId = userId;
      } else {
        targetUserId = currentUser.id;
      }
    } else {
      // Standart kullanıcı: Kesinlikle başka bir kullanıcı adına sipariş veremez
      if (userId && userId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Yetersiz yetki: Standart kullanıcılar yalnızca kendi adlarına sipariş oluşturabilir.' },
          { status: 403 }
        );
      }
      // Kullanıcı kimliği güvenilmeyen istemci verisinden değil, doğrulanmış oturumdan alınır
      targetUserId = currentUser.id;
    }

    // PRISMA TRANSACTION: Stok kontrolü ve sipariş oluşturma atomik çalışır
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Aynı ürünün birden fazla kez sepete eklenmiş olması ihtimaline karşı toplam miktarları topla
      const productTotalMap = new Map<string, number>();
      for (const item of items) {
        productTotalMap.set(
          item.productId,
          (productTotalMap.get(item.productId) || 0) + item.quantity
        );
      }

      // 2. Tüm ürünleri doğrula ve atomik olarak toplam miktarı düşür
      const productCache = new Map<string, any>();
      for (const [productId, totalQty] of Array.from(productTotalMap.entries())) {
        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          throw new Error(`Ürün bulunamadı (ID: ${productId})`);
        }

        if (product.status !== 'ACTIVE') {
          throw new Error(`"${product.name}" şu anda satışta değil.`);
        }

        if (product.stock < totalQty) {
          throw new Error(
            `"${product.name}" için yetersiz stok! Mevcut stok: ${product.stock}, Toplam istenen: ${totalQty}`
          );
        }

        // Stok miktarını atomik ve negatif stok korumalı olarak düşür
        const decrementResult = await tx.product.updateMany({
          where: {
            id: productId,
            stock: { gte: totalQty },
          },
          data: { stock: { decrement: totalQty } },
        });

        if (decrementResult.count === 0) {
          throw new Error(
            `"${product.name}" için eşzamanlı işlem nedeniyle yetersiz stok! Mevcut stok yetersiz.`
          );
        }

        const updatedProduct = await tx.product.findUnique({
          where: { id: productId },
        });

        productCache.set(productId, { ...product, remainingStock: updatedProduct?.stock ?? 0 });
      }

      // 3. Sipariş kalemlerini ve toplam tutarı oluştur
      let totalAmount = 0;
      const orderItemsToCreate = [];

      for (const item of items) {
        const product = productCache.get(item.productId);
        const subtotal = product.price * item.quantity;
        totalAmount += subtotal;

        orderItemsToCreate.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal,
        });
      }

      // 4. Kritik stok uyarıları (MED-01: Yalnızca yöneticilere gönderilir)
      for (const product of Array.from(productCache.values())) {
        if (product.remainingStock <= 5) {
          await notifyAdminsLowStock(tx, {
            id: product.id,
            name: product.name,
            stock: product.remainingStock,
          });
        }
      }

      // Benzersiz sipariş numarası oluştur
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: targetUserId,
          totalAmount,
          status: 'PROCESSING',
          paymentMethod,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          user: {
            select: { name: true, email: true },
          },
        },
      });

      // Aktivite kaydı
      await tx.activityLog.create({
        data: {
          userId: targetUserId,
          action: 'ORDER_CREATED',
          details: `${order.orderNumber} nolu sipariş oluşturuldu (Tutar: ₺${totalAmount.toFixed(2)}).`,
        },
      });

      // Sipariş bildirimi
      await tx.notification.create({
        data: {
          userId: targetUserId,
          title: 'Yeni Sipariş Onaylandı',
          message: `${order.orderNumber} nolu siparişiniz başarıyla alındı.`,
          type: 'ORDER',
        },
      });

      return order;
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError || error?.message?.includes('Yetkisiz erişim') || error?.message?.includes('Yetersiz yetki')) {
      return handleApiError(error);
    }
    console.error('Sipariş oluşturma hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Sipariş oluşturulamadı' },
      { status: 400 }
    );
  }
}
