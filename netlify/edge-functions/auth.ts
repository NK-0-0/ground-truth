// Password gate for the whole site.
//
// Every request (pages, JSON data, images, embeds) passes through this edge
// function. Visitors without a valid session cookie get a login page instead
// of the content. The password lives only in the SITE_PASSWORD environment
// variable in Netlify (never in the repo). Changing that variable invalidates
// every existing session, because the cookie is an HMAC derived from it.

const COOKIE_NAME = 'gt_auth';
const SESSION_DAYS = 30;
const LOGIN_PATH = '/__auth/login';
const LOGOUT_PATH = '/__auth/logout';

const encoder = new TextEncoder();

async function sessionToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('ground-truth-session-v1'));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

// Only allow same-site relative redirects after login.
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  return value;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function loginPage(next: string, error: boolean, status = 401): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Access required</title>
<style>
  :root { color-scheme: light dark; --bg:#f4f5f7; --card:#fff; --fg:#1b1f24; --muted:#5f6b7a; --accent:#1f6feb; --err:#c62828; --line:#d6dbe1; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0f1216; --card:#181c22; --fg:#e6e9ed; --muted:#9aa5b1; --accent:#4c8dff; --err:#ff6b6b; --line:#2c333c; } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--bg); color:var(--fg);
         font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; padding:16px; }
  form { width:100%; max-width:360px; background:var(--card); border:1px solid var(--line); border-radius:12px; padding:28px; }
  h1 { margin:0 0 4px; font-size:1.25rem; }
  p { margin:0 0 20px; color:var(--muted); font-size:.95rem; }
  label { display:block; font-size:.875rem; margin-bottom:6px; }
  input { width:100%; padding:10px 12px; font:inherit; color:inherit; background:transparent;
          border:1px solid var(--line); border-radius:8px; }
  input:focus { outline:2px solid var(--accent); outline-offset:1px; }
  button { margin-top:16px; width:100%; padding:10px; font:inherit; font-weight:600; color:#fff;
           background:var(--accent); border:0; border-radius:8px; cursor:pointer; }
  .err { color:var(--err); font-size:.875rem; margin:10px 0 0; }
</style>
</head>
<body>
<form method="post" action="${LOGIN_PATH}">
  <h1>Access required</h1>
  <p>Enter the password you were given to view this site.</p>
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
  <input type="hidden" name="next" value="${escapeHtml(next)}">
  ${error ? '<p class="err" role="alert">Incorrect password. Please try again.</p>' : ''}
  <button type="submit">Continue</button>
</form>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const password = Netlify.env.get('SITE_PASSWORD');
  if (!password) {
    // Fail closed: never serve the site if the password isn't configured.
    return new Response('Site password is not configured.', { status: 503 });
  }

  const url = new URL(request.url);
  const expected = await sessionToken(password);

  if (url.pathname === LOGOUT_PATH) {
    return new Response(null, {
      status: 303,
      headers: {
        location: '/',
        'set-cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      },
    });
  }

  if (url.pathname === LOGIN_PATH) {
    if (request.method !== 'POST') return loginPage('/', false);
    const form = await request.formData();
    const attempt = String(form.get('password') ?? '');
    const next = safeNext(String(form.get('next') ?? '/'));
    if (!safeEqual(attempt, password)) {
      // Small delay to slow down guessing.
      await new Promise((r) => setTimeout(r, 1000));
      return loginPage(next, true);
    }
    return new Response(null, {
      status: 303,
      headers: {
        location: next,
        'cache-control': 'no-store',
        'set-cookie': `${COOKIE_NAME}=${expected}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`,
      },
    });
  }

  const cookie = readCookie(request, COOKIE_NAME);
  if (cookie && safeEqual(cookie, expected)) {
    const response = await context.next();
    response.headers.set('cache-control', 'private, no-store');
    response.headers.set('x-robots-tag', 'noindex, nofollow');
    return response;
  }

  return loginPage(safeNext(url.pathname + url.search), false);
};

declare const Netlify: { env: { get(name: string): string | undefined } };

export const config = { path: '/*' };
