import * as landing from '../../app/route.ts';
import * as admin from '../../app/admin/route.ts';
import * as login from '../../app/admin/login/route.ts';
import * as logout from '../../app/admin/logout/route.ts';
import * as events from '../../app/api/events/route.ts';
import * as analytics from './analytics.mjs';
import * as settings from '../../app/api/admin/tracking/route.ts';
import * as configuration from '../../app/api/admin/config/route.ts';
import * as whatsapp from '../../app/api/whatsapp-template/route.ts';
import { submitLead } from './leads.mjs';

const routes = {
  '/': landing, '/admin': admin, '/admin/login': login, '/admin/logout': logout,
  '/api/events': events, '/api/leads': { POST: submitLead },
  '/api/admin/analytics': analytics, '/api/admin/tracking': settings,
  '/api/admin/config': configuration, '/api/whatsapp-template': whatsapp,
};

export default async function website(request, context = {}) {
  const path = new URL(request.url).pathname.replace(/\/$/, '') || '/';
  const route = routes[path];
  const headers = new Headers(request.headers);
  // Cloudflare-specific source logic receives Netlify's trusted client IP.
  headers.delete('cf-connecting-ip');
  headers.set('cf-connecting-ip', context.ip || 'local');
  const safeRequest = new Request(request, { headers });
  if (!route) return new Response('Not found', { status: 404 });
  const method = request.method === 'HEAD' ? 'GET' : request.method;
  const handler = route[method];
  if (!handler) return new Response('Method not allowed', { status: 405, headers: { Allow: Object.keys(route).filter(key => /^[A-Z]+$/.test(key)).join(', ') } });
  if (['POST','PUT','PATCH','DELETE'].includes(method)) {
    if (headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
    if (Number(headers.get('content-length') || 0) > 65536) return Response.json({ error: 'Request is too large.' }, { status: 413 });
    // Enforce the limit even when Content-Length is absent or incorrect.
    const bytes = await safeRequest.arrayBuffer();
    if (bytes.byteLength > 65536) return Response.json({ error: 'Request is too large.' }, { status: 413 });
    request = new Request(safeRequest, { body: bytes, duplex: 'half' });
  } else request = safeRequest;
  try {
    const response = await handler(request);
    const resultHeaders = new Headers(response.headers);
    resultHeaders.set('Cache-Control', 'no-store');
    resultHeaders.set('X-Content-Type-Options', 'nosniff');
    if (path.startsWith('/admin')) resultHeaders.set('Content-Security-Policy', "frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
    return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers: resultHeaders });
  } catch {
    console.error('Wood Origins request failed:', path);
    return Response.json({ error: 'The service is temporarily unavailable. Please try again.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const config = { path: ['/', '/admin', '/admin/*', '/api/*'], preferStatic: true };
