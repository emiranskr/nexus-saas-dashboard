import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Nexus SaaS Veritabanı Seed İşlemi Başlatılıyor...');

  // Mevcut verileri temizle (ters bağımlılık sırasıyla)
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 1. Şifre hash'leri
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const userPasswordHash = await bcrypt.hash('User123!', 10);

  // 2. Kullanıcılar
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nexus.io',
      name: 'Yönetici (Admin)',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@nexus.io',
      name: 'Mert Aksoy',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const standardUser = await prisma.user.create({
    data: {
      email: 'user@nexus.io',
      name: 'Demo Müşteri',
      passwordHash: userPasswordHash,
      role: 'USER',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const sampleUsersData = [
    { name: 'Selin Yılmaz', email: 'selin.yilmaz@techcorp.com', status: 'ACTIVE' },
    { name: 'Barış Demir', email: 'baris.demir@fintech.io', status: 'ACTIVE' },
    { name: 'Zeynep Çelik', email: 'zeynep.c@innovate.co', status: 'ACTIVE' },
    { name: 'Emre Karaca', email: 'emre.k@cloudsoft.net', status: 'ACTIVE' },
    { name: 'Duygu Şahin', email: 'duygu@growthlab.agency', status: 'ACTIVE' },
    { name: 'Caner Özkan', email: 'caner.ozkan@enterprise.org', status: 'SUSPENDED' },
    { name: 'Elif Aydın', email: 'elif.aydin@startuphub.io', status: 'INACTIVE' },
    { name: 'Murat Koç', email: 'murat.koc@datamind.ai', status: 'ACTIVE' },
  ];

  const createdUsers = [adminUser, staffUser, standardUser];
  for (const u of sampleUsersData) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        passwordHash: userPasswordHash,
        role: 'USER',
        status: u.status,
      },
    });
    createdUsers.push(user);
  }

  console.log(`✅ ${createdUsers.length} adet kullanıcı oluşturuldu.`);

  // 3. Kategoriler
  const categoriesData = [
    { name: 'Bulut & Altyapı', slug: 'cloud-infrastructure', description: 'Ölçeklenebilir bulut servisleri ve altyapı modülleri' },
    { name: 'Yapay Zeka & ML', slug: 'ai-machine-learning', description: 'Gelişmiş analitik ve üretken yapay zeka araçları' },
    { name: 'Siber Güvenlik', slug: 'cyber-security', description: 'Kurumsal veri koruma ve güvenlik duvarı çözümleri' },
    { name: 'Geliştirici Araçları', slug: 'developer-tools', description: 'CI/CD, API yönetim ve izleme lisansları' },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const c = await prisma.category.create({ data: cat });
    createdCategories[cat.slug] = c.id;
  }
  console.log('✅ Kategoriler oluşturuldu.');

  // 4. Ürünler
  const productsData = [
    {
      name: 'Nexus Core Engine Enterprise',
      sku: 'NXS-CORE-ENT',
      description: 'Yüksek hacimli veri işleme ve tam erişimli mikroservis kümesi.',
      price: 14999.0,
      stock: 45,
      categoryId: createdCategories['cloud-infrastructure'],
      status: 'ACTIVE',
    },
    {
      name: 'AI Smart Prompt Optimizer',
      sku: 'NXS-AI-OPT',
      description: 'Token maliyetlerini %60 azaltan akıllı LLM optimizasyon eklentisi.',
      price: 2490.0,
      stock: 120,
      categoryId: createdCategories['ai-machine-learning'],
      status: 'ACTIVE',
    },
    {
      name: 'Security Sentinel Zero-Trust',
      sku: 'NXS-SEC-ZT',
      description: '7/24 tehdit algılama ve otomatik IP izolasyonu modülü.',
      price: 5850.0,
      stock: 8, // Düşük stok örneği
      categoryId: createdCategories['cyber-security'],
      status: 'ACTIVE',
    },
    {
      name: 'DevOps Pipeline Acceleration',
      sku: 'NXS-DEV-PIPE',
      description: 'Dağıtık önbellekli otomatik build ve test işleyici motor.',
      price: 3200.0,
      stock: 85,
      categoryId: createdCategories['developer-tools'],
      status: 'ACTIVE',
    },
    {
      name: 'Real-time Telemetry & Log Hub',
      sku: 'NXS-LOG-HUB',
      description: 'Saniyede 500k log ingest edebilen gerçek zamanlı log motoru.',
      price: 4150.0,
      stock: 4, // Kritik stok uyarısı
      categoryId: createdCategories['cloud-infrastructure'],
      status: 'ACTIVE',
    },
    {
      name: 'AI Anomaly Detector v2',
      sku: 'NXS-AI-ANOM',
      description: 'Metriklerdeki sıra dışı dalgalanmaları tespit eden model paketi.',
      price: 6700.0,
      stock: 60,
      categoryId: createdCategories['ai-machine-learning'],
      status: 'ACTIVE',
    },
    {
      name: 'Compliance & Audit Vault',
      sku: 'NXS-SEC-VAULT',
      description: 'SOC2 ve ISO27001 denetimleri için otomatik raporlayıcı.',
      price: 7900.0,
      stock: 25,
      categoryId: createdCategories['cyber-security'],
      status: 'ACTIVE',
    },
    {
      name: 'API Gateway & Rate Limiter',
      sku: 'NXS-DEV-GW',
      description: 'Edge tabanlı yüksek hızlı API yönlendirici ve kota yöneticisi.',
      price: 1850.0,
      stock: 150,
      categoryId: createdCategories['developer-tools'],
      status: 'ACTIVE',
    },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const prod = await prisma.product.create({ data: p });
    createdProducts.push(prod);
  }
  console.log(`✅ ${createdProducts.length} adet ürün oluşturuldu.`);

  // 5. Siparişler ve Sipariş Öğeleri (Son 6 aya yayılan gerçekçi siparişler)
  const now = new Date();
  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PROCESSING', 'PENDING', 'CANCELLED'];
  let orderCount = 0;

  for (let i = 0; i < 35; i++) {
    // Rastgele kullanıcı ve ürünler
    const randomUser = createdUsers[Math.floor(Math.random() * (createdUsers.length - 2)) + 2]; // Admin hariç
    const daysAgo = Math.floor(Math.random() * 90); // Son 90 gün
    const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const orderStatus = statuses[Math.floor(Math.random() * statuses.length)];

    // 1-3 adet ürün seç
    const itemCount = Math.floor(Math.random() * 2) + 1;
    const selectedProducts = [...createdProducts].sort(() => 0.5 - Math.random()).slice(0, itemCount);

    let totalAmount = 0;
    const itemsData = selectedProducts.map(p => {
      const quantity = Math.floor(Math.random() * 2) + 1;
      const subtotal = p.price * quantity;
      totalAmount += subtotal;
      return {
        productId: p.id,
        quantity,
        unitPrice: p.price,
        subtotal,
      };
    });

    const orderNumber = `ORD-2026-${(1001 + i).toString()}`;

    await prisma.order.create({
      data: {
        orderNumber,
        userId: randomUser.id,
        totalAmount,
        status: orderStatus,
        paymentMethod: i % 3 === 0 ? 'BANK_TRANSFER' : 'CREDIT_CARD',
        createdAt: orderDate,
        updatedAt: orderDate,
        items: {
          create: itemsData,
        },
      },
    });
    orderCount++;
  }
  console.log(`✅ ${orderCount} adet ilişkili sipariş oluşturuldu.`);

  // 6. Bildirimler
  const notificationsData = [
    {
      userId: adminUser.id,
      title: 'Kritik Stok Uyarısı',
      message: 'Real-time Telemetry & Log Hub ürününün stok seviyesi 5 adedin altına düştü.',
      type: 'STOCK',
      isRead: false,
    },
    {
      userId: adminUser.id,
      title: 'Yeni Yüksek Tutar Siparişi',
      message: 'ORD-2026-1032 nolu sipariş için ₺14.999 tutarında ödeme onaylandı.',
      type: 'ORDER',
      isRead: false,
    },
    {
      userId: adminUser.id,
      title: 'Güvenlik Taraması Tamamlandı',
      message: 'Sistem altyapısı haftalık güvenlik ve CVE taramasından başarıyla geçti.',
      type: 'SUCCESS',
      isRead: true,
    },
    {
      userId: staffUser.id,
      title: 'Yeni Müşteri Kaydı',
      message: 'Selin Yılmaz platforma kayıt oldu ve kurumsal plana geçti.',
      type: 'INFO',
      isRead: false,
    },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }
  console.log('✅ Sistem bildirimleri oluşturuldu.');

  // 7. Aktivite Günlükleri (Activity Logs)
  const activitiesData = [
    { userId: adminUser.id, action: 'LOGIN', details: 'Yönetici konsoluna başarıyla giriş yapıldı.' },
    { userId: adminUser.id, action: 'PRODUCT_UPDATE', details: 'NXS-SEC-ZT ürün fiyatı güncellendi.' },
    { userId: staffUser.id, action: 'ORDER_STATUS_UPDATE', details: 'ORD-2026-1014 durumu COMPLETED yapıldı.' },
    { userId: adminUser.id, action: 'USER_ROLE_CHANGE', details: 'Mert Aksoy kullanıcısına ADMIN yetkisi atandı.' },
    { userId: standardUser.id, action: 'PROFILE_UPDATE', details: 'Kullanıcı profil bilgileri güncellendi.' },
  ];

  for (const a of activitiesData) {
    await prisma.activityLog.create({ data: a });
  }
  console.log('✅ Aktivite logları kaydedildi.');

  console.log('\n🎉 Veritabanı başarıyla dolduruldu!');
  console.log('------------------------------------------------');
  console.log('🔑 Demo Giriş Bilgileri:');
  console.log('   Admin: admin@nexus.io / Admin123!');
  console.log('   Staff: staff@nexus.io / Admin123!');
  console.log('   User:  user@nexus.io  / User123!');
  console.log('------------------------------------------------\n');
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
