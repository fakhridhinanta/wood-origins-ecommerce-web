import { env } from './database.mjs';
import { webhookUrl } from './credentials.mjs';

const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const string = value => typeof value === 'string' ? value.trim() : '';
const testMode = value => value === true;

export async function submitLead(request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid lead.' }, 400);
  const id = string(body.submissionId);
  const answers = body.answers;
  if (!/^[\w-]{16,100}$/.test(id) || !string(body.name) || string(body.name).length > 200 ||
      !/^[+\d() .-]{6,40}$/.test(string(body.phone)) || !answers || typeof answers !== 'object' || Array.isArray(answers) ||
      (answers.kind === 'quote_submitted' && answers.consent !== true)) {
    return json({ error: 'Enter a valid name, phone number, and consent.' }, 400);
  }
  const isTest = testMode(body.testLive);
  const url = webhookUrl();
  if (!isTest && !url) return json({ error: 'Lead delivery is not configured. Please contact us on WhatsApp.' }, 503);
  if (url && !url.startsWith('https://')) return json({ error: 'Lead delivery configuration is invalid.' }, 503);
  const now = new Date().toISOString();
  const data = {
    ...answers, submissionId: id, name: string(body.name), email: string(body.email), phone: string(body.phone),
    campaignName: string(body.campaignName), adSetName: string(body.adSetName), adName: string(body.adName),
    utmSource: string(body.utmSource), utmMedium: string(body.utmMedium), utmContent: string(body.utmContent),
    sessionId: string(body.sessionId),
  };
  // Keep both the existing camelCase fields and the original UTM names for Pabbly/Airtable.
  Object.assign(data, { utm_source: data.utmSource, utm_medium: data.utmMedium, utm_campaign: data.campaignName, utm_content: data.utmContent, Ad_Set_Name: data.adSetName });
  const db = env.DB;
  await db.prepare(`INSERT OR IGNORE INTO leads
    (submission_id,submitted_at,name,email,phone,answers,campaign_name,ad_set_name,ad_name,utm_source,utm_medium,utm_content,status,lead_source,test_live,webhook_status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,now,data.name,data.email,data.phone,JSON.stringify(data),data.campaignName,data.adSetName,data.adName,data.utmSource,data.utmMedium,data.utmContent,'new','website',isTest?'test':'live',isTest?'skipped':'pending').run();
  const lead = await db.prepare('SELECT * FROM leads WHERE submission_id=?').bind(id).first();
  // An ID cannot be reused to change submitted answers or switch between test and live.
  if (lead.test_live !== (isTest?'test':'live') || lead.answers !== JSON.stringify(data)) return json({ error: 'Submission ID has already been used.' }, 409);
  if (lead.webhook_status === 'delivered' || lead.webhook_status === 'skipped') return json({ submissionId: id, submittedAt: lead.submitted_at });
  const claim = await db.prepare("UPDATE leads SET webhook_status='sending',webhook_attempted_at=? WHERE submission_id=? AND (webhook_status IN ('pending','failed') OR (webhook_status='sending' AND webhook_attempted_at < ?)) RETURNING submission_id").bind(now,id,new Date(Date.now()-60000).toISOString()).first();
  if (!claim) return json({ error: 'Submission is still processing. Please retry shortly.', submissionId: id }, 409);
  try {
    const params = new URLSearchParams();
    for (const [key,value] of Object.entries(data)) params.set(key,value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''));
    const response = await fetch(url, { method: 'POST', body: params, signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok) throw new Error('Webhook rejected delivery');
    await db.prepare("UPDATE leads SET webhook_status='delivered' WHERE submission_id=?").bind(id).run();
    return json({ submissionId: id, submittedAt: lead.submitted_at });
  } catch {
    await db.prepare("UPDATE leads SET webhook_status='failed' WHERE submission_id=?").bind(id).run();
    return json({ error: 'Your details were saved, but delivery is delayed. Please retry.', submissionId: id }, 503);
  }
}
