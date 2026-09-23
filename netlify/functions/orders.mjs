import { getStore } from '@netlify/blobs';
import { requireAdmin, privateHeaders } from '../lib/admin-auth.mjs';
import { recentOrders } from '../lib/admin-data.mjs';

export const config = { path: '/api/orders' };

export async function serveOrders(request, { authorize, openStore }) {
  if (request.method !== 'GET') return new Response('Método não permitido', { status: 405 });
  if (!await authorize()) return new Response('Acesso restrito', { status: 403, headers: privateHeaders });
  try {
    const store = openStore();
    return Response.json({ orders: await recentOrders(store) }, { headers: privateHeaders });
  } catch {
    return Response.json({ error: 'Pedidos indisponíveis.' }, { status: 503, headers: privateHeaders });
  }
}

export default function handler(request) {
  return serveOrders(request, {
    authorize: requireAdmin,
    openStore: () => getStore({ name: 'energy-orders', consistency: 'strong' })
  });
}
