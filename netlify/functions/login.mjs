import { login, verifyRequestOrigin } from '@netlify/identity';

export const config = { path: '/api/login' };

export default async function handler(request) {
  if (request.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  try {
    verifyRequestOrigin(request);
    const { email, password } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 200 || password.length > 200) throw new Error('invalid');
    await login(email, password);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Não foi possível entrar. Confira acesso e senha.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
}
