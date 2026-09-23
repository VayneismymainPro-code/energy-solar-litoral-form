import { getStore } from '@netlify/blobs';
import { removeExpiredOrders } from '../lib/retention.mjs';

export const config = { schedule: '@daily' };

export default async function handler() {
  const orders = getStore({ name: 'energy-orders', consistency: 'strong' });
  const photos = getStore({ name: 'energy-photos', consistency: 'strong' });
  const removed = await removeExpiredOrders(orders, photos);
  console.log(`Expired orders removed: ${removed}`);
}
