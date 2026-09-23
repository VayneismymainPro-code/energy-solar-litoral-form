import test from 'node:test';
import assert from 'node:assert/strict';
import { removeExpiredOrders } from '../netlify/lib/retention.mjs';

test('deletes an expired record and photo, preserving recent records', async () => {
  const records = new Map([
    ['old', { id: '00000000-0000-4000-8000-000000000001', expiresAt: '2026-01-01T00:00:00.000Z', data: { photo: true } }],
    ['new', { id: '00000000-0000-4000-8000-000000000002', expiresAt: '2026-12-01T00:00:00.000Z', data: { photo: true } }]
  ]);
  const photosRemoved = [];
  const orders = {
    async list() { return { blobs: [...records.keys()].map(key => ({ key })) }; },
    async get(key) { return records.get(key); },
    async delete(key) { records.delete(key); }
  };
  const photos = { async delete(id) { photosRemoved.push(id); } };
  assert.equal(await removeExpiredOrders(orders, photos, new Date('2026-09-23T00:00:00Z')), 1);
  assert.deepEqual([...records.keys()], ['new']);
  assert.deepEqual(photosRemoved, ['00000000-0000-4000-8000-000000000001']);
});

test('does not drop record if private photo deletion fails', async () => {
  let deleted = false;
  const orders = {
    async list() { return { blobs: [{ key: 'old' }] }; },
    async get() { return { id: '00000000-0000-4000-8000-000000000001', expiresAt: '2026-01-01T00:00:00Z', data: { photo: true } }; },
    async delete() { deleted = true; }
  };
  await assert.rejects(removeExpiredOrders(orders, { async delete() { throw new Error('storage down'); } }, new Date('2026-09-23T00:00:00Z')));
  assert.equal(deleted, false);
});
