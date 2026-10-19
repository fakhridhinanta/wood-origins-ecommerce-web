import { database, isAdmin, privateHeaders } from "../../../../lib/tracking";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: privateHeaders });

export async function GET(request: Request) {
  if (!isAdmin(request)) return json({ error: "Administrator sign-in required." }, 403);
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
      return json({ error: "Invalid date filter." }, 400);
    }
    const db = database();
    const where = "WHERE (? = '' OR timestamp >= ?) AND (? = '' OR timestamp < ?)";
    const bounds = [from, from, to, to ? to + "T23:59:59.999Z" : ""];
    const [groups, counts, leads] = await Promise.all([
      db.prepare(`SELECT event_name, event_type, campaign_name, ad_set_name, ad_name, COUNT(*) AS result FROM website_events ${where} GROUP BY event_name,event_type,campaign_name,ad_set_name,ad_name ORDER BY result DESC,event_name LIMIT 5000`).bind(...bounds).all(),
      db.prepare(`SELECT event_type, COUNT(*) AS result FROM website_events ${where} GROUP BY event_type`).bind(...bounds).all(),
      db.prepare("SELECT * FROM leads ORDER BY submitted_at DESC LIMIT 5000").all(),
    ]);
    return json({ groups: groups.results || [], counts: counts.results || [], leads: leads.results || [] });
  } catch {
    return json({ error: "Could not load analytics." }, 503);
  }
}
