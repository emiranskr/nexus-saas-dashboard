import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, getCurrentUser, handleApiError } from '@/lib/auth';
import { updateUserSchema } from '@/lib/validations';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }

    // Yalnızca Admin veya kullanıcının kendisi detayları görebilir
    if (currentUser.role !== 'ADMIN' && currentUser.id !== params.id) {
      return NextResponse.json({ error: 'Erişim yetkiniz yok' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: { orders: true, activityLogs: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error, 'Hata oluştu');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireAdmin();
    const body = await req.json();

    const validated = updateUserSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validasyon hatası', details: validated.error.format() },
        { status: 400 }
      );
    }

    const { name, email, role, status } = validated.data;

    // E-posta çakışma kontrolü
    const existing = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        id: { not: params.id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.' },
        { status: 409 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        name,
        email: email.toLowerCase(),
        role,
        status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: adminUser.id,
        action: 'USER_UPDATED',
        details: `${updatedUser.name} kullanıcısının bilgileri güncellendi.`,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return handleApiError(error, 'Güncelleme başarısız');
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireAdmin();

    if (adminUser.id === params.id) {
      return NextResponse.json(
        { error: 'Kendi yönetici hesabınızı silemezsiniz.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    await prisma.activityLog.create({
      data: {
        userId: adminUser.id,
        action: 'USER_DELETED',
        details: `${targetUser.name} (${targetUser.email}) silindi.`,
      },
    });

    return NextResponse.json({ message: 'Kullanıcı başarıyla silindi' });
  } catch (error) {
    return handleApiError(error, 'Silme işlemi başarısız');
  }
}
