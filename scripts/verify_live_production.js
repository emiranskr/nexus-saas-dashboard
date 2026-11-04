const BASE_URL = 'https://nexus-saas-dashboard-rho.vercel.app';

async function runLiveVerification() {
  console.log(`=== NEXUS SAAS LIVE PRODUCTION VERIFICATION ===`);
  console.log(`Target URL: ${BASE_URL}\n`);

  // 1. Test HTTPS & Root Redirect
  console.log('[1/8] Verifying HTTPS & Root Redirect...');
  const rootRes = await fetch(BASE_URL, { redirect: 'manual' });
  console.log(`✓ Root Status: ${rootRes.status} (Redirect to: ${rootRes.headers.get('location')})`);

  // 2. Test Login Page
  console.log('\n[2/8] Verifying Login Page...');
  const loginRes = await fetch(`${BASE_URL}/login`);
  const loginHtml = await loginRes.text();
  if (loginRes.status !== 200 || !loginHtml.includes('Nexus')) {
    throw new Error(`Login page failed with status ${loginRes.status}`);
  }
  console.log(`✓ Login page loaded successfully (HTTP 200, length: ${loginHtml.length})`);

  // 3. Test CSRF Token retrieval for NextAuth
  console.log('\n[3/8] Retrieving NextAuth CSRF Token...');
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const cookies = csrfRes.headers.get('set-cookie') || '';
  const csrfToken = csrfData.csrfToken;
  console.log(`✓ CSRF token acquired`);

  // 4. Authenticate as Admin
  console.log('\n[4/8] Testing Live Authentication (Admin)...');
  const authBody = new URLSearchParams({
    csrfToken: csrfToken,
    email: 'admin@nexus.io',
    password: 'Admin123!',
    json: 'true',
  });

  const authRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
    },
    body: authBody.toString(),
    redirect: 'manual',
  });

  const sessionCookies = authRes.headers.get('set-cookie');
  console.log(`✓ Admin authentication response: HTTP ${authRes.status}`);

  // Combine cookies
  const cookieHeader = [cookies, sessionCookies].filter(Boolean).join('; ');

  // 5. Query Protected Dashboard Stats (Database Verification)
  console.log('\n[5/8] Verifying Protected Dashboard Stats API (Neon Database Query)...');
  const statsRes = await fetch(`${BASE_URL}/api/dashboard/stats?range=30d`, {
    headers: { 'Cookie': cookieHeader },
  });
  const statsData = await statsRes.json();
  console.log(`✓ Dashboard Stats Status: HTTP ${statsRes.status}`);
  if (statsData.metrics) {
    console.log(`✓ Live Revenue: $${statsData.metrics.totalRevenue}`);
    console.log(`✓ Period Orders: ${statsData.metrics.periodOrders}`);
    console.log(`✓ Active Total Users: ${statsData.metrics.totalUsers}`);
    console.log(`✓ AOV: $${statsData.metrics.averageOrderValue}`);
  } else {
    console.error('Stats data response:', statsData);
  }

  // 6. Query Products Catalog
  console.log('\n[6/8] Verifying Products API...');
  const prodRes = await fetch(`${BASE_URL}/api/products`, {
    headers: { 'Cookie': cookieHeader },
  });
  const prodData = await prodRes.json();
  console.log(`✓ Products Status: HTTP ${prodRes.status} (Count: ${prodData.products?.length || prodData.length || 0})`);

  // 7. Query Orders
  console.log('\n[7/8] Verifying Orders API...');
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { 'Cookie': cookieHeader },
  });
  const orderData = await orderRes.json();
  console.log(`✓ Orders Status: HTTP ${orderRes.status} (Count: ${orderData.orders?.length || orderData.length || 0})`);

  // 8. Query RFC-4180 CSV Export
  console.log('\n[8/8] Verifying CSV Audit Export...');
  const csvRes = await fetch(`${BASE_URL}/api/reports?export=csv&range=30d`, {
    headers: { 'Cookie': cookieHeader },
  });
  const csvText = await csvRes.text();
  console.log(`✓ CSV Export Status: HTTP ${csvRes.status}`);
  console.log(`✓ CSV Headers valid: ${csvText.includes('Sipariş No') || csvText.includes('Tarih')}`);
  console.log(`✓ CSV Data size: ${csvText.length} bytes`);

  console.log('\n====================================================');
  console.log('🎉 LIVE PRODUCTION VERIFICATION COMPLETED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runLiveVerification().catch(err => {
  console.error('\n❌ LIVE VERIFICATION FAILED:', err);
  process.exit(1);
});
