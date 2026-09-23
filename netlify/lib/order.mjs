import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { validateStep, buildWhatsappUrl, MAX_PHOTO_BYTES } from '../../dist/form-core.mjs';
import { classifyBillText } from './bill-text.mjs';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const allowedProperty = new Set(['Residencial', 'Comercial', 'Rural', 'Outro']);
const allowedCase = new Set(['Instalação nova', 'Troca ou adequação', 'Ainda estou avaliando']);
const allowedProject = new Set(['Sim, já tenho', 'Ainda não']);
const allowedTime = new Set(['', 'Manhã', 'Tarde', 'No horário comercial', 'Prefiro combinar']);

export class SubmissionError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function cleanData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SubmissionError('Dados do pedido inválidos.');
  const field = (name, max) => {
    if (typeof value[name] !== 'string' || value[name].length > max) throw new SubmissionError(`Campo ${name} inválido.`);
    return value[name].trim();
  };
  const data = {
    service: field('service', 12), city: field('city', 100), property: field('property', 30),
    serviceCase: field('serviceCase', 60), project: field('project', 60),
    consumption: field('consumption', 30), name: field('name', 100),
    phone: field('phone', 25), bestTime: field('bestTime', 35), notes: field('notes', 1000), photo: ''
  };
  if (!['solar', 'pattern'].includes(data.service) || !allowedProperty.has(data.property) ||
      (data.service === 'pattern' && (!allowedCase.has(data.serviceCase) || !allowedProject.has(data.project))) ||
      !allowedTime.has(data.bestTime)) throw new SubmissionError('Confira as opções selecionadas.');
  return data;
}

async function validatedImage(file) {
  if (!file) return null;
  if (!(file instanceof Blob) || file.size < 1 || file.size > MAX_PHOTO_BYTES) throw new SubmissionError('Selecione uma imagem de até 4 MB.');
  let bytes;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const source = sharp(input, { failOn: 'error', limitInputPixels: 16_000_000 });
    const metadata = await source.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new SubmissionError('Use uma imagem JPG, PNG ou WebP.');
    bytes = await source.rotate().resize({ width: 1800, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  } catch (error) {
    if (error instanceof SubmissionError) throw error;
    throw new SubmissionError('Não foi possível ler a foto. Escolha outra imagem.');
  }
  return bytes;
}

export async function submitOrder(request, { orders, photos, recognize }) {
  if (request.method !== 'POST') throw new SubmissionError('Método não permitido.', 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new SubmissionError('Origem do pedido inválida.', 403);
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 5_500_000) throw new SubmissionError('Pedido grande demais.', 413);
  let form;
  try { form = await request.formData(); } catch { throw new SubmissionError('Não foi possível ler o pedido.'); }
  if (form.get('website')) throw new SubmissionError('Pedido inválido.');
  let raw;
  try { raw = JSON.parse(String(form.get('data') || '')); } catch { throw new SubmissionError('Dados do pedido inválidos.'); }
  const data = cleanData(raw);
  const file = form.get('photo');
  if (file !== null && !(file instanceof Blob)) throw new SubmissionError('Foto inválida.');
  const image = await validatedImage(file);
  data.photo = image ? 'received' : '';
  for (const step of [1, 2, 3]) {
    const error = validateStep(data, step);
    if (error) throw new SubmissionError(error.message);
  }
  if (image && data.service === 'solar') {
    let text;
    try { text = await recognize(image); }
    catch { throw new SubmissionError('Não foi possível analisar a conta agora. Tente outra foto ou informe o consumo.', 503); }
    if (classifyBillText(text) !== 'conta_lida') {
      throw new SubmissionError('Não conseguimos ler uma conta de luz nessa foto. Envie outra ou informe o consumo.');
    }
  }
  const id = randomUUID();
  const savedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const orderKey = `${Date.now()}-${id}`;
  const record = { id, savedAt, expiresAt, data: { ...data, photo: Boolean(image) } };
  try {
    if (image) await photos.set(id, image, { metadata: { type: 'image/jpeg', expiresAt } });
    await orders.setJSON(orderKey, record);
  } catch {
    if (image) await photos.delete(id).catch(() => {});
    throw new SubmissionError('Não foi possível salvar o pedido. Seus dados continuam no formulário.', 503);
  }
  return { id, photoStored: Boolean(image), whatsappUrl: buildWhatsappUrl(data, { reference: id, photoStored: Boolean(image) }) };
}
