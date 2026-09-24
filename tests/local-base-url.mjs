export function localBaseUrl(fallback) {
  const url = new URL(process.env.BASE_URL || fallback);
  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
  if (url.protocol !== 'http:' || !loopbackHosts.has(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('BASE_URL deve ser a origem HTTP local de teste, sem caminho, credenciais ou parâmetros.');
  }
  return url.origin;
}
