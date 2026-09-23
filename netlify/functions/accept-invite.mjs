import { acceptInvite, verifyRequestOrigin } from '@netlify/identity';

export const config = { path: '/api/accept-invite' };

export async function serveInvite(request, { accept = acceptInvite, verify = verifyRequestOrigin } = {}) {
  if (request.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  try {
    verify(request);
    const { token, password } = await request.json();
    if (typeof token !== 'string' || token.length < 10 || token.length > 1000 ||
        typeof password !== 'string' || password.length < 10 || password.length > 200) {
      throw new Error('invalid');
    }
    await accept(token, password);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Convite inválido ou expirado.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}

export default function handler(request) { return serveInvite(request); }
