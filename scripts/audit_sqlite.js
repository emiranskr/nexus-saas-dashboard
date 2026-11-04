const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.resolve('prisma/dev.db');
console.log('Connecting read-only to SQLite at:', dbPath);

const db = new DatabaseSync(dbPath, { readOnly: true });

const tables = [
  'User',
  'Category',
  'Product',
  'Order',
  'OrderItem',
  'Notification',
  'ActivityLog',
];

const counts = {};
const auditReport = {};

for (const table of tables) {
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get();
  counts[table] = countRow.count;

  // Primary key duplicate check
  const pkeyDupes = db.prepare(`
    SELECT id, COUNT(*) as c FROM "${table}" GROUP BY id HAVING c > 1
  `).all();

  auditReport[table] = {
    count: countRow.count,
    duplicatePkeys: pkeyDupes.length,
  };
}

console.log('=== EXACT SQLITE RECORD COUNTS ===');
console.log(JSON.stringify(counts, null, 2));

console.log('\n=== AUDIT REPORT ===');
console.log(JSON.stringify(auditReport, null, 2));

// Foreign key check
const orphanOrderUsers = db.prepare(`
  SELECT COUNT(*) as c FROM "Order" o LEFT JOIN "User" u ON o.userId = u.id WHERE u.id IS NULL
`).get();

const orphanOrderItems = db.prepare(`
  SELECT COUNT(*) as c FROM "OrderItem" oi LEFT JOIN "Order" o ON oi.orderId = o.id WHERE o.id IS NULL
`).get();

const orphanOrderItemProducts = db.prepare(`
  SELECT COUNT(*) as c FROM "OrderItem" oi LEFT JOIN "Product" p ON oi.productId = p.id WHERE p.id IS NULL
`).get();

const orphanProductCategories = db.prepare(`
  SELECT COUNT(*) as c FROM "Product" p LEFT JOIN "Category" c ON p.categoryId = c.id WHERE c.id IS NULL
`).get();

const orphanNotifications = db.prepare(`
  SELECT COUNT(*) as c FROM "Notification" n LEFT JOIN "User" u ON n.userId = u.id WHERE u.id IS NULL
`).get();

const orphanActivityLogs = db.prepare(`
  SELECT COUNT(*) as c FROM "ActivityLog" a LEFT JOIN "User" u ON a.userId = u.id WHERE u.id IS NULL
`).get();

console.log('\n=== FOREIGN KEY INTEGRITY ===');
console.log({
  orphanOrderUsers: orphanOrderUsers.c,
  orphanOrderItems: orphanOrderItems.c,
  orphanOrderItemProducts: orphanOrderItemProducts.c,
  orphanProductCategories: orphanProductCategories.c,
  orphanNotifications: orphanNotifications.c,
  orphanActivityLogs: orphanActivityLogs.c,
});

// Check unique constraints
const dupEmail = db.prepare(`SELECT email, COUNT(*) as c FROM "User" GROUP BY email HAVING c > 1`).all();
const dupCategorySlug = db.prepare(`SELECT slug, COUNT(*) as c FROM "Category" GROUP BY slug HAVING c > 1`).all();
const dupCategoryName = db.prepare(`SELECT name, COUNT(*) as c FROM "Category" GROUP BY name HAVING c > 1`).all();
const dupProductSku = db.prepare(`SELECT sku, COUNT(*) as c FROM "Product" GROUP BY sku HAVING c > 1`).all();
const dupOrderNumber = db.prepare(`SELECT orderNumber, COUNT(*) as c FROM "Order" GROUP BY orderNumber HAVING c > 1`).all();

console.log('\n=== UNIQUE CONSTRAINTS ===');
console.log({
  duplicateEmails: dupEmail.length,
  duplicateCategorySlugs: dupCategorySlug.length,
  duplicateCategoryNames: dupCategoryName.length,
  duplicateProductSkus: dupProductSku.length,
  duplicateOrderNumbers: dupOrderNumber.length,
});

console.log('\n=== SAMPLE ROWS ===');
console.log('Sample User:', db.prepare('SELECT id, email, role, status, createdAt, updatedAt FROM "User" LIMIT 1').get());
console.log('Sample Notification:', db.prepare('SELECT id, type, isRead, createdAt FROM "Notification" LIMIT 1').get());
console.log('Sample Order:', db.prepare('SELECT id, totalAmount, status, paymentMethod, createdAt FROM "Order" LIMIT 1').get());
console.log('Sample Product:', db.prepare('SELECT id, price, stock, status, createdAt FROM "Product" LIMIT 1').get());
