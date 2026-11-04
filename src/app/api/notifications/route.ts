import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    return handleApiError(error, 'Bildirimler yüklenemedi');
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));

    if (body.id) {
      // Tek bildirimi okundu yap
      await prisma.notification.updateMany({
        where: { id: body.id, userId: user.id },
        data: { isRead: true },
      });
    } else {
      // Tümünü okundu yap
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Güncelleme başarısız');
  }
}
