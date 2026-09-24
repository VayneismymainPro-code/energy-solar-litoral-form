import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createWorker } = require('tesseract.js');

const samples = [
  ['conta-ficticia', './conta-ficticia.png'],
  ['joias-sobre-conta', './joias-sobre-conta-ficticias.png'],
  ['joias-ao-lado-conta', './joias-ao-lado-conta-ficticias.png'],
  ['joias-sem-conta', './joias-ficticias-negativo.png'],
  ['padrao-foto-08', '../../assets/cliente/whatsapp-2026-09-22/imagens/WhatsApp Image 2026-09-22 at 12.56.14 (2).jpeg']
];

const worker = await createWorker('por');
const results = [];
try {
  for (const [id, relative] of samples) {
    const { data } = await worker.recognize(await readFile(new URL(relative, import.meta.url)));
    const normalized = data.text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const matchedTerms = ['conta', 'energia', 'consumo', 'kwh', 'fatura'].filter(term => normalized.includes(term));
    results.push({ id, confidence: Math.round(data.confidence), characters: data.text.trim().length, matchedTerms });
  }
} finally {
  await worker.terminate();
}
await writeFile(new URL('./tesseract-results.json', import.meta.url), JSON.stringify(results, null, 2));
for (const result of results) console.log(JSON.stringify(result));
