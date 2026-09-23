import { logout, verifyRequestOrigin } from '@netlify/identity';

export const config = { path: '/api/logout' };

export default async function handler(request) {
  if (request.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  try {
    verifyRequestOrigin(request);
    await logout();
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return new Response('Não foi possível sair', { status: 503 }); }
}
