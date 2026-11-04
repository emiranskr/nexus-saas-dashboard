import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (role && role !== 'ALL') {
      where.role = role;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatarUrl: true,
          createdAt: true,
          _count: {
            select: { orders: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, 'Kullanıcılar yüklenemedi');
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireAdmin();
    const body = await req.json();

    const validated = registerSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validasyon hatası', details: validated.error.format() },
        { status: 400 }
      );
    }

    const { name, email, password } = validated.data;
    const role = body.role === 'ADMIN' ? 'ADMIN' : 'USER';
    const status = body.status || 'ACTIVE';

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi zaten kullanımda' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        status,
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

    await prisma.activityLog.create({
      data: {
        userId: adminUser.id,
        action: 'USER_CREATED',
        details: `${adminUser.name} tarafından ${newUser.name} kullanıcısı oluşturuldu.`,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Kullanıcı eklenemedi');
  }
}
