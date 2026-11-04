import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/auth';
import { changePasswordSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    return NextResponse.json(profile);
  } catch (error) {
    return handleApiError(error, 'Profil yüklenemedi');
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const updateData: any = {};

    // 1. İsim güncelleme
    if (body.name && typeof body.name === 'string') {
      if (body.name.trim().length < 2) {
        return NextResponse.json({ error: 'İsim en az 2 karakter olmalıdır' }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }

    // 2. Şifre değiştirme
    if (body.currentPassword && body.newPassword) {
      const validated = changePasswordSchema.safeParse({
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });

      if (!validated.success) {
        return NextResponse.json(
          { error: 'Şifre validasyon hatası', details: validated.error.format() },
          { status: 400 }
        );
      }

      const isCurrentValid = await bcrypt.compare(
        validated.data.currentPassword,
        dbUser.passwordHash
      );

      if (!isCurrentValid) {
        return NextResponse.json(
          { error: 'Mevcut şifreniz hatalı.' },
          { status: 400 }
        );
      }

      updateData.passwordHash = await bcrypt.hash(validated.data.newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'PROFILE_UPDATED',
        details: 'Kullanıcı kendi profil bilgilerini / şifresini güncelledi.',
      },
    });

    return NextResponse.json({ message: 'Profil başarıyla güncellendi', user: updated });
  } catch (error) {
    return handleApiError(error, 'Güncelleme başarısız');
  }
}
