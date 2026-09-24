import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { triageImage } from './triage.mjs';
const require = createRequire(import.meta.url);
const { createWorker } = require('tesseract.js');

const cases = [
  ['solar-clean-bill', 'solar', './conta-ficticia.png'],
  ['solar-phone-bill', 'solar', './intensive-tesseract/conta-celular-ficticia.png'],
  ['solar-bill-with-jewelry', 'solar', './joias-ao-lado-conta-ficticias.png'],
  ['solar-jewelry-only', 'solar', './joias-ficticias-negativo.png'],
  ['pattern-no-ocr', 'pattern', '../../assets/cliente/whatsapp-2026-09-22/imagens/WhatsApp Image 2026-09-22 at 12.56.14 (2).jpeg']
];
const worker = await createWorker('por');
try {
  for (const [id, service, relative] of cases) {
    const bytes = await readFile(new URL(relative, import.meta.url));
    const result = await triageImage(service, bytes, async image => (await worker.recognize(image)).data.text);
    console.log(JSON.stringify({ id, ...result }));
  }
} finally { await worker.terminate(); }
