import landing from "../templates/landing.template?raw";
import { readEventNames, readSettings } from "../lib/tracking";
export const dynamic = "force-dynamic";
export async function GET() {
 try {
 const [settings,eventNames] = await Promise.all([readSettings(),readEventNames()]);
 const html = landing.replace("__META_PIXEL_ID__", settings.metaPixelId).replaceAll("__GTM_ID__", settings.gtmId)
 .replace("__EVENT_NAMES__", JSON.stringify(eventNames))
 .replace("<!-- GTM_NOSCRIPT -->", settings.gtmId ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${settings.gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : "");
 return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
 } catch {
 return new Response("The website is temporarily unavailable. Please try again shortly.", { status: 503, headers: { "Cache-Control": "no-store" } });
 }
}
