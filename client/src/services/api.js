const ROOT = import.meta.env.VITE_API_URL || '';
export async function api(path, options = {}) {
  const response = await fetch(`${ROOT}/api${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  const body = await response.json().catch(() => ({ error: { message: 'The server returned an unreadable response.' } }));
  if (!response.ok) { const error = new Error(body.error?.message || 'Something went wrong. Please try again.'); error.status = response.status; error.code = body.error?.code; throw error; }
  return body.data;
}
