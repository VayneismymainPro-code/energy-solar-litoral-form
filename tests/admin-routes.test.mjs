import test from 'node:test';
import assert from 'node:assert/strict';
import { serveOrders } from '../netlify/functions/orders.mjs';
import { servePhoto } from '../netlify/functions/photo.mjs';
import { serveInvite } from '../netlify/functions/accept-invite.mjs';

const id = '00000000-0000-4000-8000-000000000001';

test('unauthorized request never opens the private stores', async () => {
  let storesOpened = 0;
  const dependencies = { authorize: async () => false, openStore: () => { storesOpened++; throw new Error('should not open'); } };
  assert.equal((await serveOrders(new Request('https://example.net/api/orders'), dependencies)).status, 403);
  assert.equal((await servePhoto(new Request(`https://example.net/api/photo?id=${id}`), dependencies)).status, 403);
  assert.equal(storesOpened, 0);
});

test('authorized attendant receives only stored orders and a private photo', async () => {
  const photo = new Uint8Array([1, 2, 3]).buffer;
  const orderStore = {
    async list() { return { blobs: [{ key: '1-id' }] }; },
    async get() { return { id, savedAt: '2026-09-23T00:00:00Z', expiresAt: '2026-10-23T00:00:00Z', data: { service: 'solar' } }; }
  };
  const orderResponse = await serveOrders(new Request('https://example.net/api/orders'), {
    authorize: async () => true, openStore: () => orderStore
  });
  assert.equal(orderResponse.status, 200);
  assert.equal((await orderResponse.json()).orders[0].id, id);
  assert.equal(orderResponse.headers.get('Cache-Control'), 'private, no-store');
  const photoResponse = await servePhoto(new Request(`https://example.net/api/photo?id=${id}`), {
    authorize: async () => true,
    openStore: () => ({ async getWithMetadata() { return { data: photo, metadata: { expiresAt: '2026-10-23T00:00:00Z' } }; } })
  });
  assert.equal(photoResponse.status, 200);
  assert.equal(photoResponse.headers.get('Content-Type'), 'image/jpeg');
  assert.deepEqual(new Uint8Array(await photoResponse.arrayBuffer()), new Uint8Array(photo));
});

test('invite acceptance validates method, origin and credentials before activation', async () => {
  const endpoint = 'https://example.net/api/accept-invite';
  let accepted = 0;
  const dependencies = { verify: () => {}, accept: async () => { accepted++; } };
  assert.equal((await serveInvite(new Request(endpoint), dependencies)).status, 405);
  const invalid = new Request(endpoint, { method: 'POST', body: JSON.stringify({ token: 'short', password: 'short' }) });
  assert.equal((await serveInvite(invalid, dependencies)).status, 400);
  const blocked = new Request(endpoint, { method: 'POST', body: JSON.stringify({ token: 'test-token-123', password: 'long-password-123' }) });
  assert.equal((await serveInvite(blocked, { ...dependencies, verify: () => { throw new Error('cross-origin'); } })).status, 400);
  assert.equal(accepted, 0);
  const valid = new Request(endpoint, { method: 'POST', body: JSON.stringify({ token: 'test-token-123', password: 'long-password-123' }) });
  assert.equal((await serveInvite(valid, dependencies)).status, 200);
  assert.equal(accepted, 1);
});
