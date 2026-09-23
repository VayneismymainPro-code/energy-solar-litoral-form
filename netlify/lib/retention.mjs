export async function removeExpiredOrders(orders, photos, now = new Date(), limit = 100) {
  const cutoff = now.getTime();
  const { blobs } = await orders.list({ paginate: false });
  let removed = 0;
  for (const { key } of blobs.sort((a, b) => a.key.localeCompare(b.key)).slice(0, limit)) {
    const record = await orders.get(key, { type: 'json' });
    if (!record || !record.expiresAt || Date.parse(record.expiresAt) > cutoff) continue;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(record.id || '')) continue;
    if (record.data?.photo) await photos.delete(record.id);
    await orders.delete(key);
    removed++;
  }
  return removed;
}
