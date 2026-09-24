import { classifyBillText } from './policy.mjs';
import { decodeBeforeOcr } from './intensive-tesseract/preflight.mjs';

export async function triageImage(service, bytes, recognize) {
  if (service !== 'solar' && service !== 'pattern') return { status: 'invalid', reason: 'service' };
  const file = await decodeBeforeOcr(bytes);
  if (!file.accepted) return { status: 'invalid', reason: file.reason };
  if (service === 'pattern') return { status: 'accepted', evidence: 'valid-image' };
  try {
    const text = await recognize(bytes);
    return classifyBillText(text) === 'conta_lida'
      ? { status: 'accepted', evidence: 'bill-text' }
      : { status: 'uncertain', reason: 'bill-text-not-found' };
  } catch {
    return { status: 'uncertain', reason: 'ocr-unavailable' };
  }
}
