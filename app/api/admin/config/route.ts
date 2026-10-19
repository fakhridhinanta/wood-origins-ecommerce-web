import { database, defaultEvents, isAdmin, metaStandardEvents, privateHeaders } from "../../../../lib/tracking";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: privateHeaders });
const canWrite = (request: Request) =>
  isAdmin(request) &&
  request.headers.get("origin") === new URL(request.url).origin &&
  request.headers.get("content-type")?.startsWith("application/json");

export async function GET(request: Request) {
  if (!isAdmin(request)) return json({ error: "Administrator sign-in required." }, 403);
  try {
    const db = database();
    const [events, templates] = await Promise.all([
      db.prepare("SELECT * FROM event_config ORDER BY event_key").all(),
      db.prepare("SELECT * FROM whatsapp_templates ORDER BY updated_at DESC").all(),
    ]);
    return json({
      events: events.results || [],
      templates: templates.results || [],
      defaults: defaultEvents,
      standardEvents: metaStandardEvents,
    });
  } catch {
    return json({ error: "Could not load configuration." }, 503);
  }
}

export async function PUT(request: Request) {
  if (!canWrite(request)) return json({ error: "Administrator sign-in and same-origin JSON required." }, 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    const now = new Date().toISOString();
    if (body.events && typeof body.events === "object" && !Array.isArray(body.events)) {
      const entries = Object.entries(body.events as Record<string, unknown>);
      for (const [key, value] of entries) {
        if (!(key in defaultEvents) || !/^[A-Za-z][A-Za-z0-9_]{1,49}$/.test(String(value || "").trim())) {
          return json({ error: "Invalid event name." }, 400);
        }
      }
      for (const [key, value] of entries) {
        const name = String(value).trim();
        await database().prepare(
          "INSERT INTO event_config (event_key,meta_event_name,gtm_event_name,updated_at) VALUES (?,?,?,?) ON CONFLICT(event_key) DO UPDATE SET meta_event_name=excluded.meta_event_name,gtm_event_name=excluded.gtm_event_name,updated_at=excluded.updated_at"
        ).bind(key, name, name, now).run();
      }
    }
    if (body.template && typeof body.template === "object") {
      const t = body.template as Record<string, unknown>;
      const campaign = String(t.campaignName || "").trim();
      const adset = String(t.adSetName || "").trim();
      const ad = String(t.adName || "").trim();
      const hashcode = String(t.hashcode || "").trim();
      const status = String(t.status || "active");
      const notes = String(t.notes || "").trim();
      const id = Number(t.id || 0);
      if (!campaign || !adset || !ad || !hashcode ||
          campaign.length > 250 || adset.length > 250 || ad.length > 250 ||
          hashcode.length > 100 || notes.length > 1000 ||
          !/^[-A-Za-z0-9_]+$/.test(hashcode) ||
          !["active", "inactive"].includes(status) ||
          (id && (!Number.isInteger(id) || id < 1))) {
        return json({ error: "Enter campaign, ad set, ad, and a hashcode using letters, numbers, hyphens, or underscores." }, 400);
      }
      if (id) {
        const result = await database().prepare(
          "UPDATE whatsapp_templates SET campaign_name=?,ad_set_name=?,ad_name=?,message=?,status=?,notes=?,updated_at=? WHERE id=?"
        ).bind(campaign, adset, ad, hashcode, status, notes, now, id).run();
        if (!result.meta.changes) return json({ error: "Template not found." }, 404);
      } else {
        await database().prepare(
          "INSERT INTO whatsapp_templates (campaign_name,ad_set_name,ad_name,message,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)"
        ).bind(campaign, adset, ad, hashcode, status, notes, now, now).run();
      }
    }
    return json({ saved: true });
  } catch {
    return json({ error: "Could not save configuration." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!canWrite(request)) return json({ error: "Administrator sign-in and same-origin JSON required." }, 403);
  try {
    const body = await request.json() as { id?: unknown };
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "Invalid template ID." }, 400);
    const result = await database().prepare("DELETE FROM whatsapp_templates WHERE id=?").bind(id).run();
    return result.meta.changes ? json({ deleted: true }) : json({ error: "Template not found." }, 404);
  } catch {
    return json({ error: "Could not delete template." }, 503);
  }
}
