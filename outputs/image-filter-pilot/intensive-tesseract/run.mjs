import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { classifyBillText } from '../policy.mjs';

const require = createRequire(import.meta.url);
const { createWorker, PSM } = require('tesseract.js');

const samples = [
  { id: 'bill-clean', expectedBillOnly: true, path: '../conta-ficticia.png' },
  { id: 'bill-phone-photo', expectedBillOnly: true, path: './conta-celular-ficticia.png' },
  { id: 'jewelry-on-bill', expectedBillOnly: false, path: '../joias-sobre-conta-ficticias.png' },
  { id: 'jewelry-beside-bill', expectedBillOnly: false, path: '../joias-ao-lado-conta-ficticias.png' },
  { id: 'jewelry-only', expectedBillOnly: false, path: '../joias-ficticias-negativo.png' },
  { id: 'pattern-photo', expectedBillOnly: false, path: '../../../assets/cliente/whatsapp-2026-09-22/imagens/WhatsApp Image 2026-09-22 at 12.56.14 (2).jpeg' },
  { id: 'solar-panels', expectedBillOnly: false, path: '../../../assets/cliente/whatsapp-2026-09-22/imagens/WhatsApp Image 2026-09-22 at 13.00.13 (3).jpeg' },
  { id: 'logo', expectedBillOnly: false, path: '../../../dist/energy-solar-mark.png' }
];
const modes = [
  { id: 'single-block', value: PSM.SINGLE_BLOCK, repetitions: 2 },
  { id: 'auto', value: PSM.AUTO, repetitions: 1 },
  { id: 'sparse', value: PSM.SPARSE_TEXT, repetitions: 1 }
];

const patterns = {
  document: /\b(conta|fatura)\b/,
  energy: /\benergia\b/,
  usage: /\b(consumo|kwh)\b/
};
const data = await Promise.all(samples.map(async sample => ({ ...sample, bytes: await readFile(new URL(sample.path, import.meta.url)) })));
const startedAt = new Date().toISOString();
const initStart = performance.now();
const worker = await createWorker('por');
const initializationMs = Math.round(performance.now() - initStart);
const results = [];
const failures = [];
try {
  for (const mode of modes) {
    await worker.setParameters({ tessedit_pageseg_mode: mode.value });
    for (let repetition = 1; repetition <= mode.repetitions; repetition++) {
      for (const sample of data) {
        const start = performance.now();
        try {
          const { data: recognized } = await worker.recognize(sample.bytes);
          const normalized = recognized.text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
          const terms = Object.fromEntries(Object.entries(patterns).map(([name, regex]) => [name, regex.test(normalized)]));
          const ocrOnlyWouldApprove = Object.values(terms).every(Boolean);
          const ocrDecision = classifyBillText(recognized.text);
          results.push({
            mode: mode.id, repetition, id: sample.id, expectedBillOnly: sample.expectedBillOnly,
            confidence: Math.round(recognized.confidence), characters: recognized.text.trim().length,
            terms, ocrOnlyWouldApprove, ocrDecision,
            textHash: createHash('sha256').update(recognized.text).digest('hex').slice(0, 12),
            elapsedMs: Math.round(performance.now() - start)
          });
        } catch (error) {
          failures.push({ mode: mode.id, repetition, id: sample.id, error: String(error.message || error).slice(0, 250) });
        }
      }
    }
  }
} finally {
  await worker.terminate();
}

const summary = {
  startedAt,
  tesseractJsVersion: require('tesseract.js/package.json').version,
  language: 'por', initializationMs,
  imageCount: samples.length,
  recognitionCount: results.length,
  modes: modes.map(mode => ({ id: mode.id, repetitions: mode.repetitions })),
  mixedBillRecognitions: results.filter(row => row.id.includes('jewelry') && row.ocrOnlyWouldApprove).map(({ mode, repetition, id }) => ({ mode, repetition, id })),
  missedBills: results.filter(row => row.expectedBillOnly && !row.ocrOnlyWouldApprove).map(({ mode, repetition, id }) => ({ mode, repetition, id })),
  failures,
  memoryRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024)
};
await writeFile(new URL('./results.json', import.meta.url), JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary));
for (const mode of modes) {
  const rows = results.filter(row => row.mode === mode.id && row.repetition === 1);
  console.log(JSON.stringify({ mode: mode.id, rows: rows.map(({ id, confidence, terms, ocrOnlyWouldApprove, elapsedMs }) => ({ id, confidence, terms, ocrOnlyWouldApprove, elapsedMs })) }));
}
