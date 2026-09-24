import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { triageImage } from './triage.mjs';

const bill = () => readFile(new URL('./conta-ficticia.png', import.meta.url));
const mixed = () => readFile(new URL('./joias-ao-lado-conta-ficticias.png', import.meta.url));
const words = 'CONTA DE ENERGIA ELÉTRICA, consumo de 452 kWh';

test('solar accepts bill words, including mixed image, under the settled OCR-only rule', async () => {
  assert.deepEqual(await triageImage('solar', await bill(), async () => words), { status: 'accepted', evidence: 'bill-text' });
  assert.deepEqual(await triageImage('solar', await mixed(), async () => words), { status: 'accepted', evidence: 'bill-text' });
});

test('solar keeps missing OCR text or OCR failure uncertain', async () => {
  assert.deepEqual(await triageImage('solar', await bill(), async () => 'joias'), { status: 'uncertain', reason: 'bill-text-not-found' });
  assert.deepEqual(await triageImage('solar', await bill(), async () => { throw new Error('worker failed'); }), { status: 'uncertain', reason: 'ocr-unavailable' });
});

test('pattern accepts decoded image without calling OCR', async () => {
  assert.deepEqual(await triageImage('pattern', await mixed(), async () => { throw new Error('OCR must not run'); }), { status: 'accepted', evidence: 'valid-image' });
});

test('invalid image or service never reaches OCR', async () => {
  let calls = 0;
  const recognize = async () => { calls += 1; return words; };
  assert.deepEqual(await triageImage('solar', Buffer.from('not a photo'), recognize), { status: 'invalid', reason: 'decode' });
  assert.deepEqual(await triageImage('other', await bill(), recognize), { status: 'invalid', reason: 'service' });
  assert.equal(calls, 0);
});
