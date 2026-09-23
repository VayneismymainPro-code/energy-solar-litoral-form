import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:8888';
await mkdir('outputs/netlify-qa', { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('[data-service="solar"]').click();
  await page.locator('#city-solar').fill('Matinhos');
  await page.locator('#property-solar').selectOption('Residencial');
  await page.locator('#next-button').click();
  await page.locator('#bill-photo').setInputFiles('outputs/image-filter-pilot/conta-ficticia.png');
  await page.locator('#next-button').click();
  await page.locator('#name').fill('Pessoa Teste');
  await page.locator('#phone').fill('(41) 99999-9999');
  await page.locator('#next-button').click();
  await page.locator('#result-view').waitFor({ state: 'visible', timeoutMs: 30000 });
  assert.match(await page.locator('#summary').innerText(), /Recebida pelo formulário/);
  assert.match(await page.locator('#step-title').innerText(), /Pedido registrado/);
  const message = new URL(await page.locator('#send-whatsapp').getAttribute('href')).searchParams.get('text');
  assert.match(message, /Conta enviada pelo formulário/);
  assert.match(message, /\*Pedido:\* [0-9a-f-]{36}/);
  await page.screenshot({ path: 'outputs/netlify-qa/solar-mobile-registrado.png', fullPage: true });
  await page.locator('#restart-button').click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-service="pattern"]').click();
  await page.locator('#city-pattern').fill('Pontal do Paraná');
  await page.locator('#property-pattern').selectOption('Residencial');
  await page.locator('[data-case="Instalação nova"]').click();
  await page.locator('#next-button').click();
  await page.locator('[data-project="Ainda não"]').click();
  await page.locator('#next-button').click();
  await page.locator('#name').fill('Pessoa Teste');
  await page.locator('#phone').fill('(41) 3333-4444');
  await page.locator('#next-button').click();
  await page.locator('#result-view').waitFor({ state: 'visible', timeoutMs: 30000 });
  assert.match(await page.locator('#summary').innerText(), /Instalação nova/);
  await page.screenshot({ path: 'outputs/netlify-qa/pattern-desktop-registrado.png', fullPage: true });
  assert.deepEqual(errors, []);
  await page.close();

  const admin = await browser.newPage();
  await admin.goto(`${base}/admin.html`);
  assert.ok(await admin.locator('#login-form').isVisible());
  assert.equal(await admin.locator('#orders-section').isVisible(), false);
  await admin.screenshot({ path: 'outputs/netlify-qa/admin-sem-login.png' });
  await admin.close();
  console.log('Netlify browser checks passed: real OCR/store submission, text-only pattern request, and private admin gate. WhatsApp not opened.');
} finally { await browser.close(); }
