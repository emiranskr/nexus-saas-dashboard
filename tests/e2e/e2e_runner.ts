/**
 * NEXUS SAAS PLATFORM - E2E & KULLANICI AKIŞI TESTLERİ
 * Headless Browser (Edge CDP) + Native WebSocket (Sıfır Dış Bağımlılık)
 */

import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import os from 'os';
import fs from 'fs';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 3005;
const CDP_PORT = 9225;

const results: { name: string; passed: boolean; details?: string }[] = [];
function recordResult(name: string, passed: boolean, details = '') {
  results.push({ name, passed, details });
  const icon = passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`${icon} ${name} ${details ? '(' + details + ')' : ''}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpGet(url: string): Promise<{ statusCode?: number; data: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      })
      .on('error', reject);
  });
}

class CDPClient {
  wsUrl: string;
  id = 1;
  callbacks = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  consoleErrors: string[] = [];
  pageErrors: string[] = [];
  ws!: WebSocket;

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data.toString());
        if (msg.method === 'Runtime.consoleAPICalled') {
          if (msg.params.type === 'error') {
            const text = msg.params.args.map((a: any) => a.value || a.description || '').join(' ');
            this.consoleErrors.push(text);
          }
        }
        if (msg.method === 'Runtime.exceptionThrown') {
          this.pageErrors.push(
            msg.params.exceptionDetails.text +
              (msg.params.exceptionDetails.exception?.description || '')
          );
        }
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id)!;
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(msg.error);
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method: string, params: Record<string, any> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression: string): Promise<any> {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        res.exceptionDetails.text + ' ' + (res.exceptionDetails.exception?.description || '')
      );
    }
    return res.result?.value;
  }
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('🚀 NEXUS SAAS PLATFORM E2E VE AKIŞ DOĞRULAMA TESTİ');
  console.log('====================================================\n');

  let nextProc: any = null;
  let edgeProc: any = null;
  const tempUserDataDir = path.join(os.tmpdir(), `edge_nexus_cdp_${Date.now()}`);

  try {
    // 1. Next.js Production Sunucusunu Başlat
    console.log('[1/8] Next.js sunucusu (next start -p 3005) başlatılıyor...');
    nextProc = spawn('npx.cmd', ['next', 'start', '-p', PORT.toString()], {
      cwd: path.resolve(__dirname, '../../'),
      shell: true,
      env: {
        ...process.env,
        PORT: PORT.toString(),
        NEXTAUTH_URL: `http://localhost:${PORT}`,
      },
    });

    let serverReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await httpGet(`http://localhost:${PORT}/login`);
        if (res.statusCode === 200) {
          serverReady = true;
          break;
        }
      } catch {}
      await sleep(1000);
    }

    recordResult('Next.js Sunucusu Başlatma & HTTP 200 Yanıtı', serverReady, `Port: ${PORT}`);
    if (!serverReady) {
      throw new Error('Next.js sunucusu zamanında yanıt vermedi.');
    }

    // 2. Headless Edge'i Başlat
    console.log('\n[2/8] Headless Edge başlatılıyor...');
    const edgeArgs = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-extensions',
      '--window-size=1280,900',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${tempUserDataDir}`,
      'about:blank',
    ];
    edgeProc = spawn(EDGE_PATH, edgeArgs);
    await sleep(2000);

    const versionRes = await httpGet(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targets = JSON.parse(versionRes.data);
    const pageTarget = targets.find((t: any) => t.type === 'page');

    if (!pageTarget) throw new Error('CDP page hedefi bulunamadı.');

    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // 3. Login Sayfası Testi
    console.log('\n[3/8] Giriş Sayfası (/login) test ediliyor...');
    await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/login` });
    await sleep(1500);

    const loginTitle = await cdp.eval('document.title');
    recordResult('Giriş Sayfası Başlık Doğrulaması', loginTitle.includes('Nexus'), `Title: ${loginTitle}`);

    // Hızlı Demo Admin doldurma ve giriş
    console.log('   Admin demo butonu tıklanıp form gönderiliyor...');
    await cdp.eval(`
      const buttons = Array.from(document.querySelectorAll('button'));
      const adminBtn = buttons.find(b => b.innerText.includes('Yönetici') || b.innerText.includes('Admin'));
      if (adminBtn) adminBtn.click();
    `);
    await sleep(300);

    await cdp.eval(`
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    `);

    // Dashboard'a yönlendirmeyi bekle
    let redirected = false;
    for (let i = 0; i < 25; i++) {
      const currentUrl = await cdp.eval('window.location.pathname');
      if (currentUrl.includes('/dashboard')) {
        redirected = true;
        break;
      }
      await sleep(500);
    }
    recordResult('Kimlik Doğrulama: Giriş Başarılı & /dashboard Yönlendirmesi', redirected);

    // 4. Ana Dashboard Sayfası ve Veri Doğrulaması (İstatistiklerin yüklenmesini bekle)
    console.log('\n[4/8] Dashboard Metrikleri ve Grafikler kontrol ediliyor...');
    let hasKpiCards = false;
    for (let i = 0; i < 20; i++) {
      hasKpiCards = await cdp.eval(`
        (() => {
          const bodyText = document.body.innerText;
          return bodyText.includes('Genel Bakış') && (bodyText.includes('Toplam Gelir') || bodyText.includes('TOPLAM GELİR'));
        })()
      `);
      if (hasKpiCards) break;
      await sleep(500);
    }
    recordResult('Dashboard: Canlı KPI Kartları Görüntüleme', hasKpiCards);

    const hasRecentOrders = await cdp.eval(`
      const rows = document.querySelectorAll('tbody tr');
      rows.length >= 1;
    `);
    recordResult('Dashboard: Son Siparişler Tablosu Verisi', hasRecentOrders);

    // 5. Kullanıcı Yönetimi Sayfası
    console.log('\n[5/8] Kullanıcı Yönetimi (/dashboard/users) test ediliyor...');
    await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/dashboard/users` });
    await sleep(2500);

    const userTableCount = await cdp.eval(`
      document.querySelectorAll('tbody tr').length;
    `);
    recordResult('Kullanıcı Yönetimi: Tablo Listeleme', userTableCount >= 5, `Yüklenen kullanıcı: ${userTableCount}`);

    // 6. Ürün ve Stok Sayfası
    console.log('\n[6/8] Ürün Kataloğu (/dashboard/products) test ediliyor...');
    await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/dashboard/products` });
    await sleep(2500);

    const productCount = await cdp.eval(`
      document.querySelectorAll('tbody tr').length;
    `);
    recordResult('Ürün Yönetimi: Ürün Listeleme & Stok Gösterimi', productCount >= 5, `Yüklenen ürün: ${productCount}`);

    // 7. Siparişler Sayfası
    console.log('\n[7/8] Siparişler (/dashboard/orders) test ediliyor...');
    await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/dashboard/orders` });
    await sleep(2500);

    const orderRows = await cdp.eval(`
      document.querySelectorAll('tbody tr').length;
    `);
    recordResult('Sipariş Yönetimi: Sipariş Tablosu & Durum Rozetleri', orderRows >= 5, `Yüklenen sipariş: ${orderRows}`);

    // 8. Raporlar ve CSV Dışa Aktarma
    console.log('\n[8/8] Finansal Raporlar (/dashboard/reports) test ediliyor...');
    await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/dashboard/reports` });
    
    let hasReportSummary = false;
    for (let i = 0; i < 20; i++) {
      hasReportSummary = await cdp.eval(`
        (() => {
          const bodyText = document.body.innerText;
          return bodyText.includes('Finansal Analiz') && (bodyText.includes('Dönem Toplam Geliri') || bodyText.includes('DÖNEM TOPLAM GELİRİ'));
        })()
      `);
      if (hasReportSummary) break;
      await sleep(500);
    }
    recordResult('Raporlama: Finansal Özet & Ciro Analizi', hasReportSummary);

    // CSV endpoint'i oturumlu tarayıcı içinden doğrula
    const csvContent = await cdp.eval(`
      (async () => {
        const res = await fetch('/api/reports?format=csv&days=30');
        const text = await res.text();
        return {
          status: res.status,
          hasHeaders: text.includes('Siparis No') && text.includes('Tutar (TL)'),
          length: text.length
        };
      })()
    `);
    const isCsvValid = csvContent.status === 200 && csvContent.hasHeaders;
    recordResult('Raporlama: CSV Rapor Dışa Aktarma Motoru', isCsvValid, `${csvContent.length} bytes CSV verisi`);
  } catch (err: any) {
    console.error('Test hatası:', err);
    recordResult('Test Yürütücü İstisnası', false, err.message);
  } finally {
    console.log('\nTemizlik yapılıyor: Süreçler sonlandırılıyor...');
    if (edgeProc) edgeProc.kill('SIGKILL');
    if (nextProc) nextProc.kill('SIGKILL');
    try {
      if (fs.existsSync(tempUserDataDir)) {
        fs.rmSync(tempUserDataDir, { recursive: true, force: true });
      }
    } catch {}
  }

  console.log('\n====================================================');
  console.log('📊 E2E TEST SONUÇLARI ÖZETİ');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Toplam Test: ${total}`);
  console.log(`Başarılı:    ${passed}`);
  console.log(`Başarısız:   ${failed}`);
  console.log(`Başarı Oranı: ${Math.round((passed / total) * 100)}%\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 TÜM E2E VE KULLANICI AKIŞI TESTLERİ BAŞARIYLA TAMAMLANDI!');
    process.exit(0);
  }
}

runE2ETests();
