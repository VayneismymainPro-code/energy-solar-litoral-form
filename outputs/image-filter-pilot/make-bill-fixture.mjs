import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 720, height: 980 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    body{margin:0;background:#e6e8e7;font:18px Arial,sans-serif;color:#202a2b;padding:32px}
    main{background:white;border:1px solid #a8b4b4;box-shadow:0 4px 12px #0002;padding:32px;min-height:790px}
    header{border-bottom:5px solid #24645f;padding-bottom:22px;margin-bottom:25px}small{font-size:13px;color:#536060}
    h1{font-size:27px;margin:0 0 10px}h2{font-size:21px;margin-top:36px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #c8cece;padding:14px 0}
    .total{font-size:25px;font-weight:bold;background:#eaf3f1;padding:20px;margin-top:25px}
  </style></head><body><main><header><small>DOCUMENTO FICTÍCIO PARA TESTE</small><h1>CONTA DE ENERGIA ELÉTRICA</h1><div>Unidade consumidora: EXEMPLO-0001</div></header>
    <div class="row"><span>Referência</span><strong>Setembro de 2026</strong></div>
    <div class="row"><span>Endereço</span><strong>Rua Exemplo, 100 — Matinhos, PR</strong></div>
    <h2>Energia consumida</h2><div class="row"><span>Leitura anterior</span><strong>12.480 kWh</strong></div>
    <div class="row"><span>Leitura atual</span><strong>12.932 kWh</strong></div>
    <div class="row"><span>Consumo do mês</span><strong>452 kWh</strong></div>
    <div class="total">Total ilustrativo: R$ 360,00</div>
    <p><small>Esta imagem é sintética e não representa uma fatura real.</small></p>
  </main></body></html>`);
  await page.screenshot({ path: fileURLToPath(new URL('./conta-ficticia.png', import.meta.url)), fullPage: true });
} finally { await browser.close(); }
