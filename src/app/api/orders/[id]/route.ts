import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError } from '@/lib/auth';
import { updateOrderStatusSchema } from '@/lib/validations';
import { notifyAdminsLowStock } from '@/lib/notifications';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, price: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && order.userId !== user.id) {
      return NextResponse.json({ error: 'Erişim yetkiniz yok' }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error, 'Sipariş yüklenemedi');
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireAdmin();
    const body = await req.json();

    const validated = updateOrderStatusSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Geçersiz sipariş durumu' },
        { status: 400 }
      );
    }

    const newStatus = validated.data.status;

    // PRISMA TRANSACTION: Concurrency, FSM ve stok bütünlüğü atomik olarak garanti edilir
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Transaction içinde en güncel sipariş verisini çek (Concurrency Safe)
      const currentOrder = await tx.order.findUnique({
        where: { id: params.id },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!currentOrder) {
        throw new Error('Sipariş bulunamadı');
      }

      // 2. Durum değişikliği yoksa hiçbir işlem yapma (Idempotence)
      if (currentOrder.status === newStatus) {
        return currentOrder;
      }

      // 3. Durum Geçiş Kuralları (FSM)
      // COMPLETED olan bir sipariş geriye dönük PENDING veya PROCESSING durumuna alınamaz
      if (currentOrder.status === 'COMPLETED' && (newStatus === 'PENDING' || newStatus === 'PROCESSING')) {
        throw new Error('Tamamlanmış sipariş geriye dönük işleme veya bekleme durumuna alınamaz.');
      }

      // Concurrency Lock: Atomik olarak sadece mevcut durumdaysa yeni duruma geçir
      const transitionResult = await tx.order.updateMany({
        where: { id: params.id, status: currentOrder.status },
        data: { status: newStatus },
      });

      if (transitionResult.count === 0) {
        // Eşzamanlı başka bir istek bu geçişi zaten tamamladı (Idempotent Concurrency Safe)
        const refreshed = await tx.order.findUnique({ where: { id: params.id } });
        return refreshed || currentOrder;
      }

      const isCancelling = newStatus === 'CANCELLED' && currentOrder.status !== 'CANCELLED';
      const isReactivating = currentOrder.status === 'CANCELLED' && newStatus !== 'CANCELLED';

      // 4. Aynı ürünün birden fazla kalem olarak bulunabilmesi ihtimaline karşı toplam miktarları grupla
      const productQuantities = new Map<string, number>();
      for (const item of currentOrder.items) {
        productQuantities.set(
          item.productId,
          (productQuantities.get(item.productId) || 0) + item.quantity
        );
      }

      // 5. İptal Durumu: Stokları geri iade et (Gruplanmış miktarlar üzerinden)
      if (isCancelling) {
        for (const [productId, quantity] of Array.from(productQuantities.entries())) {
          await tx.product.update({
            where: { id: productId },
            data: { stock: { increment: quantity } },
          });
        }
      }

      // 6. İptalden Aktife Geçiş: Önce tüm ürünlerin stok yeterliliğini kontrol et, ardından atomik düş
      if (isReactivating) {
        // A) Önce tüm ürünlerin stoklarını kontrol et
        for (const [productId, totalRequired] of Array.from(productQuantities.entries())) {
          const currentProduct = await tx.product.findUnique({
            where: { id: productId },
          });

          if (!currentProduct) {
            throw new Error(`Ürün bulunamadı (ID: ${productId})`);
          }

          if (currentProduct.stock < totalRequired) {
            throw new Error(
              `"${currentProduct.name}" için yetersiz stok! Mevcut stok: ${currentProduct.stock}, Gerekli: ${totalRequired}`
            );
          }
        }

        // B) Hepsi yeterliyse atomik olarak stokları düşür
        for (const [productId, totalRequired] of Array.from(productQuantities.entries())) {
          const decrementResult = await tx.product.updateMany({
            where: {
              id: productId,
              stock: { gte: totalRequired },
            },
            data: {
              stock: { decrement: totalRequired },
            },
          });

          if (decrementResult.count === 0) {
            throw new Error(
              `Eşzamanlı işlem nedeniyle stok tükendi. İşlem iptal edildi.`
            );
          }

          // Düşük stok kontrolü (MED-01)
          const updatedProd = await tx.product.findUnique({
            where: { id: productId },
            select: { id: true, name: true, stock: true },
          });
          if (updatedProd && updatedProd.stock <= 5) {
            await notifyAdminsLowStock(tx, updatedProd);
          }
        }
      }

      // 7. Güncel siparişi getir
      const order = await tx.order.findUniqueOrThrow({
        where: { id: params.id },
      });

      // 8. Aktivite günlüğü kaydet
      let activityDetails = `${order.orderNumber} sipariş durumu "${currentOrder.status}" -> "${newStatus}" olarak değiştirildi.`;
      if (isCancelling) {
        activityDetails = `${order.orderNumber} nolu sipariş iptal edildi. Ürün stokları geri iade edildi.`;
      } else if (isReactivating) {
        activityDetails = `${order.orderNumber} nolu sipariş iptalden çıkarılarak "${newStatus}" durumuna alındı. Stoklar yeniden rezerve edildi.`;
      }

      await tx.activityLog.create({
        data: {
          userId: adminUser.id,
          action: 'ORDER_STATUS_UPDATED',
          details: activityDetails,
        },
      });

      return order;
    });

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    if (
      error?.message?.includes('yetersiz stok') ||
      error?.message?.includes('bulunamadı') ||
      error?.message?.includes('geriye dönük') ||
      error?.message?.includes('Geçersiz')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error, 'Sipariş güncellenemedi');
  }
}
