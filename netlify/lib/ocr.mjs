import { fileURLToPath } from 'node:url';
import { createWorker } from 'tesseract.js';

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
