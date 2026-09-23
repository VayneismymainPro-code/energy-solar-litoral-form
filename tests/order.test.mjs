import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { submitOrder, SubmissionError } from '../netlify/lib/order.mjs';
import { requireAdmin } from '../netlify/lib/admin-auth.mjs';

const fixture = () => readFile(new URL('../outputs/image-filter-pilot/conta-ficticia.png', import.meta.url));
const base = {
  service: 'solar', city: 'Matinhos', property: 'Residencial', serviceCase: '', project: '',
  consumption: '', name: 'Pessoa Teste', phone: '(41) 99999-9999', bestTime: 'Manhã', notes: ''
};

function fakeStores({ failOrder = false } = {}) {
  const photoEntries = new Map();
  const orderEntries = new Map();
  return {
    photoEntries, orderEntries,
    photos: { async set(id, data) { photoEntries.set(id, data); }, async delete(id) { photoEntries.delete(id); } },
    orders: { async setJSON(id, value) { if (failOrder) throw new Error('storage unavailable'); orderEntries.set(id, value); } }
  };
}

function request(data, bytes) {
  const form = new FormData();
  form.set('data', JSON.stringify(data));
  if (bytes) form.set('photo', new File([bytes], 'foto.png', { type: 'image/png' }));
  return new Request('https://example.net/api/submit', { method: 'POST', body: form });
}

test('solar stores a decoded bill only after OCR and returns a matching reference', async () => {
  const store = fakeStores();
  const result = await submitOrder(request(base, await fixture()), { ...store, recognize: async () => 'CONTA DE ENERGIA. Consumo 452 kWh' });
  assert.equal(result.photoStored, true);
  assert.equal(store.photoEntries.size, 1);
  assert.equal(store.orderEntries.size, 1);
  const record = [...store.orderEntries.values()][0];
  assert.ok(record.id === result.id);
  assert.ok(record.data.photo);
  const lifetime = Date.parse(record.expiresAt) - Date.parse(record.savedAt);
  assert.ok(lifetime >= 30 * 24 * 60 * 60 * 1000 - 1000 && lifetime <= 30 * 24 * 60 * 60 * 1000 + 1000);
  assert.match(new URL(result.whatsappUrl).searchParams.get('text'), /Conta enviada pelo formulário/);
  assert.match(new URL(result.whatsappUrl).searchParams.get('text'), new RegExp(result.id));
});

test('solar photo with no bill text or broken OCR never reaches storage', async () => {
  for (const recognize of [async () => 'joias', async () => { throw new Error('OCR failed'); }]) {
    const store = fakeStores();
    await assert.rejects(submitOrder(request(base, await fixture()), { ...store, recognize }), SubmissionError);
    assert.equal(store.photoEntries.size, 0);
    assert.equal(store.orderEntries.size, 0);
  }
});

test('the settled OCR rule accepts a bill even when jewelry appears beside it', async () => {
  const store = fakeStores();
  const mixed = await readFile(new URL('../outputs/image-filter-pilot/joias-ao-lado-conta-ficticias.png', import.meta.url));
  const result = await submitOrder(request(base, mixed), { ...store, recognize: async () => 'CONTA DE ENERGIA, consumo de 452 kWh' });
  assert.equal(result.photoStored, true);
});

test('pattern accepts a valid photo without calling OCR', async () => {
  const store = fakeStores();
  const data = { ...base, service: 'pattern', serviceCase: 'Instalação nova', project: 'Ainda não' };
  const result = await submitOrder(request(data, await fixture()), { ...store, recognize: async () => { throw new Error('OCR should not run'); } });
  assert.equal(result.photoStored, true);
  assert.match(new URL(result.whatsappUrl).searchParams.get('text'), /Foto do local: enviada pelo formulário/);
});

test('solar with consumption and no photo records text-only request', async () => {
  const store = fakeStores();
  const result = await submitOrder(request({ ...base, consumption: '450' }), { ...store, recognize: async () => { throw new Error('OCR should not run'); } });
  assert.equal(result.photoStored, false);
  assert.equal(store.photoEntries.size, 0);
  assert.equal(store.orderEntries.size, 1);
});

test('invalid file and invalid fields do not persist, and failed order write removes photo', async () => {
  for (const [data, bytes] of [[base, Buffer.from('not an image')], [{ ...base, phone: '12345678' }, await fixture()]]) {
    const store = fakeStores();
    await assert.rejects(submitOrder(request(data, bytes), { ...store, recognize: async () => 'CONTA DE ENERGIA Consumo kWh' }), SubmissionError);
    assert.equal(store.photoEntries.size, 0);
  }
  const store = fakeStores({ failOrder: true });
  await assert.rejects(submitOrder(request(base, await fixture()), { ...store, recognize: async () => 'CONTA DE ENERGIA Consumo kWh' }), SubmissionError);
  assert.equal(store.photoEntries.size, 0);
});

test('server rejects photos above 4 MB before decoding or OCR', async () => {
  const store = fakeStores();
  await assert.rejects(submitOrder(request(base, Buffer.alloc(4 * 1024 * 1024 + 1)), {
    ...store, recognize: async () => { throw new Error('OCR must not run'); }
  }), error => error instanceof SubmissionError && /4 MB/.test(error.message));
  assert.equal(store.photoEntries.size, 0);
  assert.equal(store.orderEntries.size, 0);
});

test('admin role is required for private access', async () => {
  assert.equal(await requireAdmin(async () => null), false);
  assert.equal(await requireAdmin(async () => ({ roles: ['member'] })), false);
  assert.equal(await requireAdmin(async () => ({ roles: ['admin'] })), true);
});

test('cross-site browser posts are rejected before storage', async () => {
  const store = fakeStores();
  const form = new FormData();
  form.set('data', JSON.stringify({ ...base, consumption: '450' }));
  const request = new Request('https://energy.example/api/submit', { method: 'POST', headers: { Origin: 'https://another.example' }, body: form });
  await assert.rejects(submitOrder(request, { ...store, recognize: async () => '' }), error => error instanceof SubmissionError && error.status === 403);
  assert.equal(store.orderEntries.size, 0);
});
