export async function recentOrders(store, limit = 50, now = new Date()) {
  const { blobs } = await store.list({ paginate: false });
  const recent = blobs.sort((a, b) => b.key.localeCompare(a.key)).slice(0, limit);
  const records = (await Promise.all(recent.map(({ key }) => store.get(key, { type: 'json' })))).filter(Boolean);
  return records.filter(record => record.expiresAt && Date.parse(record.expiresAt) > now.getTime())
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function privatePhoto(store, id, now = new Date()) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id || '')) return { status: 400 };
  const entry = await store.getWithMetadata(id, { type: 'arrayBuffer' });
  if (!entry || !entry.metadata?.expiresAt || Date.parse(entry.metadata.expiresAt) <= now.getTime()) return { status: 404 };
  return { status: 200, photo: entry.data };
}
