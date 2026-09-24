import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeBeforeOcr } from './preflight.mjs';

test('valid fixture is decoded before OCR regardless of its filename', async () => {
  const valid = await readFile(new URL('../conta-ficticia.png', import.meta.url));
  const result = await decodeBeforeOcr(valid);
  assert.equal(result.accepted, true);
  assert.equal(result.format, 'png');
});

test('empty, text posing as JPG, and oversized buffers fail closed', async () => {
  for (const bytes of [Buffer.alloc(0), Buffer.from('not an image'), Buffer.alloc(10 * 1024 * 1024 + 1)]) {
    assert.equal((await decodeBeforeOcr(bytes)).accepted, false);
  }
});

test('truncated actual image fails full decode', async () => {
  const valid = await readFile(new URL('../conta-ficticia.png', import.meta.url));
  assert.equal((await decodeBeforeOcr(valid.subarray(0, Math.floor(valid.length / 2)))).accepted, false);
});
