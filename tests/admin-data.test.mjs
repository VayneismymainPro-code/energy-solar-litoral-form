import test from 'node:test';
import assert from 'node:assert/strict';
import { recentOrders, privatePhoto } from '../netlify/lib/admin-data.mjs';

test('orders show newest records first and keep a 50 item bound', async () => {
  const items = Array.from({ length: 55 }, (_, index) => ({ key: `${String(index).padStart(13, '0')}-id` }));
  const store = {
    async list() { return { blobs: items }; },
    async get(key) { return { id: key, savedAt: new Date(Number(key.slice(0, 13))).toISOString(), expiresAt: '2026-12-01T00:00:00Z' }; }
  };
  const results = await recentOrders(store, 50, new Date('2026-09-23T00:00:00Z'));
  assert.equal(results.length, 50);
  assert.equal(results[0].id, '0000000000054-id');
  assert.equal(results.at(-1).id, '0000000000005-id');
});

test('photo read rejects malformed references and reports missing files', async () => {
  const id = '00000000-0000-4000-8000-000000000001';
  let reads = 0;
  const store = { async getWithMetadata() { reads++; return null; } };
  assert.deepEqual(await privatePhoto(store, '../other'), { status: 400 });
  assert.equal(reads, 0);
  assert.deepEqual(await privatePhoto(store, id), { status: 404 });
  const photo = new ArrayBuffer(4);
  const withExpiry = { async getWithMetadata() { return { data: photo, metadata: { expiresAt: '2026-12-01T00:00:00Z' } }; } };
  assert.deepEqual(await privatePhoto(withExpiry, id, new Date('2026-09-23T00:00:00Z')), { status: 200, photo });
  assert.deepEqual(await privatePhoto(withExpiry, id, new Date('2026-12-02T00:00:00Z')), { status: 404 });
});

test('expired orders are not shown before the daily deletion runs', async () => {
  const store = {
    async list() { return { blobs: [{ key: 'old' }, { key: 'new' }] }; },
    async get(key) { return { id: key, savedAt: '2026-09-01T00:00:00Z', expiresAt: key === 'old' ? '2026-09-20T00:00:00Z' : '2026-10-01T00:00:00Z' }; }
  };
  assert.deepEqual((await recentOrders(store, 50, new Date('2026-09-23T00:00:00Z'))).map(item => item.id), ['new']);
});
