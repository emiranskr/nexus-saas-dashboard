import { test, expect } from '@playwright/test';

test.describe('Nexus SaaS E2E Test Suite', () => {
  test('Landing page redirects or displays title', async ({ page }) => {
    await page.goto('/');
    // Either landing page or redirects to dashboard/login
    await expect(page).toHaveTitle(/Nexus/i);
  });

  test('Login with demo credentials works and redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Nexus')).toBeVisible();

    // Click demo admin button
    const adminButton = page.locator('button:has-text("Yönetici")');
    if (await adminButton.isVisible()) {
      await adminButton.click();
    } else {
      await page.fill('input[type="email"]', 'admin@nexus.io');
      await page.fill('input[type="password"]', 'Admin123!');
      await page.click('button[type="submit"]');
    }

    // Expect navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('text=Dashboard Genel Bakış')).toBeVisible();
  });

  test('Dashboard displays metrics and navigation works', async ({ page }) => {
    // Authenticate first
    await page.goto('/login');
    await page.locator('button:has-text("Yönetici")').click();
    await page.waitForURL('**/dashboard');

    // Metrics cards should exist
    await expect(page.locator('text=Toplam Gelir')).toBeVisible();
    await expect(page.locator('text=Toplam Sipariş')).toBeVisible();
    await expect(page.locator('text=Aktif Kullanıcı')).toBeVisible();

    // Navigate to Users
    await page.click('a[href="/dashboard/users"]');
    await page.waitForURL('**/dashboard/users');
    await expect(page.locator('text=Kullanıcı Yönetimi')).toBeVisible();

    // Navigate to Products
    await page.click('a[href="/dashboard/products"]');
    await page.waitForURL('**/dashboard/products');
    await expect(page.locator('text=Ürün Kataloğu')).toBeVisible();

    // Navigate to Orders
    await page.click('a[href="/dashboard/orders"]');
    await page.waitForURL('**/dashboard/orders');
    await expect(page.locator('text=Sipariş Yönetimi')).toBeVisible();

    // Navigate to Reports
    await page.click('a[href="/dashboard/reports"]');
    await page.waitForURL('**/dashboard/reports');
    await expect(page.locator('text=Analiz ve Raporlar')).toBeVisible();

    // Navigate to Settings
    await page.click('a[href="/dashboard/settings"]');
    await page.waitForURL('**/dashboard/settings');
    await expect(page.locator('text=Hesap ve Sistem Ayarları')).toBeVisible();
  });
});
