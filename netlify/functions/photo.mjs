import { getStore } from '@netlify/blobs';
import { requireAdmin, privateHeaders } from '../lib/admin-auth.mjs';
import { privatePhoto } from '../lib/admin-data.mjs';

export const config = { path: '/api/photo' };

export async function servePhoto(request, { authorize, openStore }) {
  if (request.method !== 'GET') return new Response('Método não permitido', { status: 405 });
  if (!await authorize()) return new Response('Acesso restrito', { status: 403, headers: privateHeaders });
  const id = new URL(request.url).searchParams.get('id');
  try {
    const { status, photo } = await privatePhoto(openStore(), id);
    if (status !== 200) return new Response(status === 400 ? 'Pedido inválido' : 'Foto não encontrada', { status, headers: privateHeaders });
    return new Response(photo, { headers: { ...privateHeaders, 'Content-Type': 'image/jpeg' } });
  } catch {
    return new Response('Foto indisponível', { status: 503, headers: privateHeaders });
  }
}

export default function handler(request) {
  return servePhoto(request, {
    authorize: requireAdmin,
    openStore: () => getStore({ name: 'energy-photos', consistency: 'strong' })
  });
}
