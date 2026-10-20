import admin from "../../templates/admin.template?raw";
import { isAdmin, privateHeaders } from "../../lib/tracking";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
 if (!(await isAdmin(request))) return Response.redirect(new URL("/admin/login", request.url), 302);
 return new Response(admin, { headers: { ...privateHeaders, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "frame-ancestors 'self'" } });
}
