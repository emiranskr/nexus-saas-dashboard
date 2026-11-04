import { PrismaClient, Prisma } from '@prisma/client';

export const LOW_STOCK_THRESHOLD = 5;

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export interface LowStockProductInfo {
  id?: string;
  name: string;
  stock: number;
}

/**
 * Düşük stok uyarısını yalnızca ve doğrudan ADMIN rolündeki kullanıcılara gönderir.
 *
 * Kurallar (MED-01):
 * 1. Yalnızca stok <= 5 (LOW_STOCK_THRESHOLD) durumunda çalışır.
 * 2. Bildirimler yalnızca ADMIN rolündeki kullanıcılara iletilir (USER rolündeki müşterilere asla gönderilmez).
 * 3. Birden fazla yönetici varsa tüm yöneticilere gönderilir.
 * 4. Sistemde hiç yönetici yoksa uygulama çökmeden güvenli şekilde devam eder.
 * 5. Aynı ürün için zaten okunmamış (isRead: false) bir kritik stok bildirimi varsa mükerrer bildirim oluşturmaz.
 */
export async function notifyAdminsLowStock(
  client: PrismaClientOrTx,
  product: LowStockProductInfo
): Promise<void> {
  if (product.stock > LOW_STOCK_THRESHOLD) {
    return;
  }

  try {
    // 1. Sistemdeki tüm ADMIN rolündeki kullanıcıları bul
    const admins = await client.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    if (!admins || admins.length === 0) {
      return;
    }

    const title = 'Kritik Stok Uyarısı';
    const message = `"${product.name}" ürününde son ${product.stock} adet kaldı.`;

    // 2. Her yönetici için mükerrer okunmamış bildirimi önleyerek bildirim oluştur
    for (const admin of admins) {
      const existingUnread = await client.notification.findFirst({
        where: {
          userId: admin.id,
          type: 'STOCK',
          isRead: false,
          message: {
            contains: product.name,
          },
        },
      });

      if (!existingUnread) {
        await client.notification.create({
          data: {
            userId: admin.id,
            title,
            message,
            type: 'STOCK',
          },
        });
      }
    }
  } catch (error) {
    // Bildirim oluşturma hatası ana işlemi engellememeli
    console.error('Düşük stok bildirimi gönderilirken hata oluştu:', error);
  }
}
