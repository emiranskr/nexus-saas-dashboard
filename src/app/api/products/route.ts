import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError } from '@/lib/auth';
import { productSchema } from '@/lib/validations';
import { notifyAdminsLowStock } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = categoryId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    return handleApiError(error, 'Ürünler yüklenemedi');
  }
}

export async function POST(req: Request) {
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

    const existingSku = await prisma.product.findUnique({
      where: { sku: validated.data.sku },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: 'Bu SKU koduyla bir ürün zaten kayıtlı.' },
        { status: 409 }
      );
    }

    const newProduct = await prisma.product.create({
      data: validated.data,
      include: {
        category: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: adminUser.id,
        action: 'PRODUCT_CREATED',
        details: `${newProduct.name} (${newProduct.sku}) ürünü eklendi.`,
      },
    });

    // Stok 5 veya altındaysa tüm yöneticilere bildirim oluştur (MED-01)
    if (newProduct.stock <= 5) {
      await notifyAdminsLowStock(prisma, newProduct);
    }

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Ürün eklenemedi');
  }
}
