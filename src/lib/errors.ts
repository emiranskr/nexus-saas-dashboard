import { NextResponse } from 'next/server';

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Yetkisiz erişim: Lütfen giriş yapınız.') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = 'Yetersiz yetki: Bu işlem için Yönetici (Admin) rolü gereklidir.') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Merkezi API Hata Yönetim Fonksiyonu (HIGH-02 Çözümü)
 * - 401: Oturum açmamış / yetkisiz istekler
 * - 403: Oturumu olan ama rolü yetersiz kullanıcılar
 * - 500: Gerçek sunucu veya veritabanı hataları
 */
export function handleApiError(error: unknown, fallbackMessage = 'İşlem sırasında sunucu hatası oluştu') {
  // Next.js statik derleme dinamik sunucu kullanımı kontrolü
  if ((error as any)?.digest === 'DYNAMIC_SERVER_USAGE') {
    throw error;
  }

  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Yetkisiz erişim')) {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (message.includes('Yetersiz yetki')) {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  console.error('API Sunucu Hatası (500):', error);
  return NextResponse.json(
    { error: fallbackMessage },
    { status: 500 }
  );
}
