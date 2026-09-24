import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

export async function decodeBeforeOcr(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 10 * 1024 * 1024) return { accepted: false, reason: 'size' };
  try {
    const source = sharp(bytes, { failOn: 'error', limitInputPixels: 16_000_000 });
    const metadata = await source.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format)) return { accepted: false, reason: 'format' };
    await source.raw().toBuffer();
    return { accepted: true, format: metadata.format, width: metadata.width, height: metadata.height };
  } catch {
    return { accepted: false, reason: 'decode' };
  }
}
