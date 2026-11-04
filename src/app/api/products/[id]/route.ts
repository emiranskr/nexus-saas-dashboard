import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError } from '@/lib/auth';
import { productSchema } from '@/lib/validations';
import { notifyAdminsLowStock } from '@/lib/notifications';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return handleApiError(error, 'Ürün yüklenemedi');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireAdmin();
    const body = await req.json();

    const validated = productSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validasyon hatası', details: validated.error.format() },
        { status: 400 }
      );
    }

    // SKU çakışma kontrolü
    const existingSku = await prisma.product.findFirst({
      where: {
        sku: validated.data.sku,
        id: { not: params.id },
      },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: 'Bu SKU kodu başka bir ürüne ait.' },
        { status: 409 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: validated.data,
      include: { category: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: adminUser.id,
        action: 'PRODUCT_UPDATED',
        details: `${updatedProduct.name} ürün bilgileri güncellendi.`,
      },
    });

    // Düşük stok uyarısı kontrolü (MED-01: tüm yöneticilere gönderilir)
    if (updatedProduct.stock <= 5) {
      await notifyAdminsLowStock(prisma, updatedProduct);
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    return handleApiError(error, 'Ürün güncellenemedi');
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireAdmin();

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { orderItems: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    // İlişkili sipariş varsa silmek yerine arşivle
    if (product._count.orderItems > 0) {
      const archived = await prisma.product.update({
        where: { id: params.id },
        data: { status: 'ARCHIVED' },
      });
      return NextResponse.json({
        message: 'Ürünün geçmiş siparişleri bulunduğu için arşive taşındı.',
        product: archived,
      });
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    await prisma.activityLog.create({
      data: {
        userId: adminUser.id,
        action: 'PRODUCT_DELETED',
        details: `${product.name} (${product.sku}) silindi.`,
      },
    });

    return NextResponse.json({ message: 'Ürün başarıyla silindi' });
  } catch (error) {
    return handleApiError(error, 'Ürün silinemedi');
  }
}
