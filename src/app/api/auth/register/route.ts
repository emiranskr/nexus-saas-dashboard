import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validasyon hatası', details: validated.error.format() },
        { status: 400 }
      );
    }

    const { name, email, password } = validated.data;
    const normalizedEmail = email.toLowerCase();

    // E-posta benzersizlik kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.' },
        { status: 409 }
      );
    }

    // Şifreyi hashle
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Aktivite ve bildirim oluştur
    await prisma.activityLog.create({
      data: {
        userId: newUser.id,
        action: 'REGISTER',
        details: 'Yeni kullanıcı hesabı oluşturuldu.',
      },
    });

    return NextResponse.json(
      { message: 'Kayıt başarılı', user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error('Kayıt API hatası:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası oluştu. Lütfen tekrar deneyiniz.' },
      { status: 500 }
    );
  }
}
