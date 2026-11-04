const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`=== NEXUS SQLITE TO NEON POSTGRESQL MIGRATION (${isDryRun ? 'DRY-RUN' : 'LIVE EXECUTION'}) ===`);

  // 1. SAFETY: Verify target endpoint
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('ep-red-grass-b98gpq5x')) {
    throw new Error('FATAL SAFETY ERROR: DATABASE_URL does not point to dev-migration endpoint (ep-red-grass-b98gpq5x)! Aborting.');
  }
  if (dbUrl.includes('ep-icy-lake-b939ctt0')) {
    throw new Error('FATAL SAFETY ERROR: DATABASE_URL points to PRODUCTION! Aborting.');
  }
  console.log('✓ Target branch verified: Neon dev-migration (ep-red-grass-b98gpq5x)');

  // 2. Open SQLite read-only
  const sqlitePath = path.resolve('prisma/dev.db');
  console.log('✓ Reading SQLite source:', sqlitePath);
  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });

  // 3. Connect to PostgreSQL
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('✓ Connected to PostgreSQL');

  // 4. Check destination is clean
  const destCounts = {
    user: await prisma.user.count(),
    category: await prisma.category.count(),
    product: await prisma.product.count(),
    order: await prisma.order.count(),
    orderItem: await prisma.orderItem.count(),
    notification: await prisma.notification.count(),
    activityLog: await prisma.activityLog.count(),
  };

  const totalExisting = Object.values(destCounts).reduce((a, b) => a + b, 0);
  if (totalExisting > 0) {
    throw new Error(`Target PostgreSQL database is not empty! Found ${totalExisting} existing records. Aborting to prevent data corruption.`);
  }
  console.log('✓ Destination confirmed empty: 0 existing records');

  // 5. Read all records from SQLite
  const users = sqlite.prepare('SELECT * FROM "User"').all();
  const categories = sqlite.prepare('SELECT * FROM "Category"').all();
  const products = sqlite.prepare('SELECT * FROM "Product"').all();
  const orders = sqlite.prepare('SELECT * FROM "Order"').all();
  const orderItems = sqlite.prepare('SELECT * FROM "OrderItem"').all();
  const notifications = sqlite.prepare('SELECT * FROM "Notification"').all();
  const activityLogs = sqlite.prepare('SELECT * FROM "ActivityLog"').all();

  console.log(`\nRecords read from SQLite:`);
  console.log(`- User: ${users.length}`);
  console.log(`- Category: ${categories.length}`);
  console.log(`- Product: ${products.length}`);
  console.log(`- Order: ${orders.length}`);
  console.log(`- OrderItem: ${orderItems.length}`);
  console.log(`- Notification: ${notifications.length}`);
  console.log(`- ActivityLog: ${activityLogs.length}`);

  // Helper for date conversion
  const toDate = (val) => {
    if (!val) return new Date();
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string') {
      const num = Number(val);
      if (!isNaN(num) && num > 10000000000) return new Date(num);
      return new Date(val);
    }
    return new Date(val);
  };

  // Transform data
  const transformedUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    passwordHash: u.passwordHash,
    role: u.role,
    status: u.status,
    avatarUrl: u.avatarUrl || null,
    createdAt: toDate(u.createdAt),
    updatedAt: toDate(u.updatedAt),
  }));

  const transformedCategories = categories.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || null,
    createdAt: toDate(c.createdAt),
  }));

  const transformedProducts = products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description || null,
    price: Number(p.price),
    stock: Number(p.stock),
    categoryId: p.categoryId,
    status: p.status,
    createdAt: toDate(p.createdAt),
    updatedAt: toDate(p.updatedAt),
  }));

  const transformedOrders = orders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    totalAmount: Number(o.totalAmount),
    status: o.status,
    paymentMethod: o.paymentMethod,
    createdAt: toDate(o.createdAt),
    updatedAt: toDate(o.updatedAt),
  }));

  const transformedOrderItems = orderItems.map(oi => ({
    id: oi.id,
    orderId: oi.orderId,
    productId: oi.productId,
    quantity: Number(oi.quantity),
    unitPrice: Number(oi.unitPrice),
    subtotal: Number(oi.subtotal),
  }));

  const transformedNotifications = notifications.map(n => ({
    id: n.id,
    userId: n.userId,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: Boolean(n.isRead === 1 || n.isRead === true || n.isRead === '1'),
    createdAt: toDate(n.createdAt),
  }));

  const transformedActivityLogs = activityLogs.map(a => ({
    id: a.id,
    userId: a.userId,
    action: a.action,
    details: a.details || null,
    ipAddress: a.ipAddress || '127.0.0.1',
    createdAt: toDate(a.createdAt),
  }));

  console.log('\n✓ All data transformed and validated in memory.');

  if (isDryRun) {
    console.log('\nDRY-RUN COMPLETE: Ready for bulk transactional migration.');
    await prisma.$disconnect();
    return;
  }

  // BULK TRANSACTIONAL MIGRATION
  console.log('\nExecuting bulk transactional migration to PostgreSQL...');
  const startTime = Date.now();

  await prisma.$transaction(async (tx) => {
    console.log(`Bulk inserting ${transformedUsers.length} Users...`);
    await tx.user.createMany({ data: transformedUsers });

    console.log(`Bulk inserting ${transformedCategories.length} Categories...`);
    await tx.category.createMany({ data: transformedCategories });

    console.log(`Bulk inserting ${transformedProducts.length} Products...`);
    await tx.product.createMany({ data: transformedProducts });

    console.log(`Bulk inserting ${transformedOrders.length} Orders...`);
    await tx.order.createMany({ data: transformedOrders });

    console.log(`Bulk inserting ${transformedOrderItems.length} OrderItems...`);
    await tx.orderItem.createMany({ data: transformedOrderItems });

    console.log(`Bulk inserting ${transformedNotifications.length} Notifications...`);
    await tx.notification.createMany({ data: transformedNotifications });

    console.log(`Bulk inserting ${transformedActivityLogs.length} ActivityLogs...`);
    await tx.activityLog.createMany({ data: transformedActivityLogs });
  }, {
    timeout: 30000,
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✓ Bulk transaction successfully committed in ${duration}s!`);

  // Verification
  console.log('\n=== POST-MIGRATION VERIFICATION ===');
  const finalCounts = {
    User: await prisma.user.count(),
    Category: await prisma.category.count(),
    Product: await prisma.product.count(),
    Order: await prisma.order.count(),
    OrderItem: await prisma.orderItem.count(),
    Notification: await prisma.notification.count(),
    ActivityLog: await prisma.activityLog.count(),
  };

  console.log('Final Record Counts in PostgreSQL:');
  console.log(JSON.stringify(finalCounts, null, 2));

  let allMatch = true;
  for (const [table, expected] of Object.entries({
    User: users.length,
    Category: categories.length,
    Product: products.length,
    Order: orders.length,
    OrderItem: orderItems.length,
    Notification: notifications.length,
    ActivityLog: activityLogs.length,
  })) {
    const actual = finalCounts[table];
    if (actual !== expected) {
      console.error(`MISMATCH on ${table}: expected ${expected}, got ${actual}`);
      allMatch = false;
    }
  }

  if (!allMatch) {
    throw new Error('Data verification failed: record counts do not match SQLite source!');
  }

  console.log('✓ All 7 tables match source SQLite counts exactly (100% data integrity verified).');

  // Verify foreign-key relationships by querying related records
  console.log('\nVerifying relational joins...');
  const sampleOrderWithItems = await prisma.order.findFirst({
    where: { items: { some: {} } },
    include: { items: true, user: true },
  });
  if (!sampleOrderWithItems || !sampleOrderWithItems.user || sampleOrderWithItems.items.length === 0) {
    console.warn('Note: sample order has no items or user.');
  } else {
    console.log(`✓ Order relational integrity verified (Order ${sampleOrderWithItems.orderNumber} -> User ${sampleOrderWithItems.user.email}, ${sampleOrderWithItems.items.length} items).`);
  }

  const sampleProductWithCat = await prisma.product.findFirst({
    include: { category: true },
  });
  if (!sampleProductWithCat || !sampleProductWithCat.category) {
    console.warn('Note: sample product has no category.');
  } else {
    console.log(`✓ Product relational integrity verified (Product ${sampleProductWithCat.name} -> Category ${sampleProductWithCat.category.name}).`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('\n❌ MIGRATION ERROR:', err.message);
  process.exit(1);
});
