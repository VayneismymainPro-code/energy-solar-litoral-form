import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { createWorker } = require('tesseract.js');

export async function readBillText(image) {
  const worker = await createWorker('por', 1, {
    langPath: fileURLToPath(new URL('../ocr', import.meta.url)),
    gzip: false,
    cacheMethod: 'none'
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally { await worker.terminate(); }
}
