import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { localBaseUrl } from './local-base-url.mjs';

const base = localBaseUrl('http://127.0.0.1:8888');
const fields = {
  service: 'solar', city: 'Matinhos', property: 'Residencial', serviceCase: '', project: '',
  consumption: '', name: 'Pessoa Teste', phone: '(41) 99999-9999', bestTime: 'Manhã', notes: ''
};
const bill = await readFile(new URL('./fixtures/conta-ficticia.png', import.meta.url));
const unrelatedPhoto = await readFile(new URL('./fixtures/imagem-sem-conta-ficticia.png', import.meta.url));

async function post(data, bytes) {
  const form = new FormData();
  form.set('data', JSON.stringify(data));
  if (bytes) form.set('photo', new File([bytes], 'teste.png', { type: 'image/png' }));
  const response = await fetch(`${base}/api/submit`, { method: 'POST', body: form });
  return { status: response.status, body: await response.json() };
}

const acceptedBill = await post(fields, bill);
assert.equal(acceptedBill.status, 201);
assert.equal(acceptedBill.body.photoStored, true);
assert.ok(acceptedBill.body.id);
assert.match(new URL(acceptedBill.body.whatsappUrl).searchParams.get('text'), /Conta enviada pelo formulário/);
console.log('PASS: solar bill OCR and storage');

const rejectedPhoto = await post(fields, unrelatedPhoto);
assert.equal(rejectedPhoto.status, 400);
assert.match(rejectedPhoto.body.error, /conta de luz/);
console.log('PASS: solar without bill text is rejected');

const noPhoto = await post({ ...fields, consumption: '450' });
assert.equal(noPhoto.status, 201);
assert.equal(noPhoto.body.photoStored, false);
console.log('PASS: solar consumption without photo');

const pattern = await post({ ...fields, service: 'pattern', serviceCase: 'Instalação nova', project: 'Ainda não', voltage: 'Não sei' }, unrelatedPhoto);
assert.equal(pattern.status, 201);
assert.equal(pattern.body.photoStored, true);
console.log('PASS: pattern photo accepted without OCR by agreed rule');

const broken = await post(fields, Buffer.from('not image bytes'));
assert.equal(broken.status, 400);
console.log('PASS: invalid image bytes rejected');

const privateOrders = await fetch(`${base}/api/orders`);
assert.equal(privateOrders.status, 403);
const privatePhoto = await fetch(`${base}/api/photo?id=${encodeURIComponent(acceptedBill.body.id)}`);
assert.equal(privatePhoto.status, 403);
console.log('PASS: orders and photo blocked without admin login');
