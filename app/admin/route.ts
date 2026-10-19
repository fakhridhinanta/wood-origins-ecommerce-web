import admin from "../../templates/admin.template?raw";
import { isAdmin, privateHeaders } from "../../lib/tracking";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
 if (!request.headers.get("oai-authenticated-user-id")) return Response.redirect(new URL("/signin-with-chatgpt?return_to=%2Fadmin", request.url), 302);
 if (!isAdmin(request)) return new Response("Only the site administrator can access this page.", { status: 403, headers: privateHeaders });
 return new Response(admin, { headers: { ...privateHeaders, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "frame-ancestors 'self'" } });
}
