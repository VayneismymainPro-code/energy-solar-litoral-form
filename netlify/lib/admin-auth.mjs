import { getUser } from '@netlify/identity';

export async function requireAdmin(currentUser = getUser) {
  const user = await currentUser();
  return user?.roles?.includes('admin') === true;
}

export const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
