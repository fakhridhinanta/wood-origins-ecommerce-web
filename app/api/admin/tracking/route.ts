import { database, isAdmin, privateHeaders, readSettings, validateSettings } from "../../../../lib/tracking";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: privateHeaders });
export async function GET(request: Request) {
 if (!(await isAdmin(request))) return json({ error: "Administrator sign-in required." }, 403);
 try { return json(await readSettings()); }
 catch { return json({ error: "Could not load settings. Please try again." }, 503); }
}
export async function PUT(request: Request) {
 if (!(await isAdmin(request))) return json({ error: "Administrator sign-in required." }, 403);
 if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);
 if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON is required." }, 415);
 try {
 const body = await request.text();
 if (body.length > 4096) return json({ error: "Request is too large." }, 413);
 let input: unknown;
 try { input = JSON.parse(body); } catch { return json({ error: "Invalid JSON." }, 400); }
 const settings = validateSettings(input);
 if (!settings) return json({ error: "Enter a numeric Meta Pixel ID and a GTM ID such as GTM-ABC1234. Leave a field empty to disable it." }, 400);
 const updatedAt = new Date().toISOString();
 await database().prepare("INSERT INTO tracking_settings (id, meta_pixel_id, gtm_id, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET meta_pixel_id = excluded.meta_pixel_id, gtm_id = excluded.gtm_id, updated_at = excluded.updated_at")
 .bind(settings.metaPixelId, settings.gtmId, updatedAt).run();
 return json({ ...settings, updatedAt });
 } catch { return json({ error: "Could not save settings. Your changes have not been confirmed; please reload and try again." }, 503); }
}
