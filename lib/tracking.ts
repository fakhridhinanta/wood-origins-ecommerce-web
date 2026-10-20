import { env } from "cloudflare:workers";
export type TrackingSettings = { metaPixelId: string; gtmId: string; updatedAt: string | null };
export const defaults: TrackingSettings = { metaPixelId: "888308479780678", gtmId: "GTM-MCS3SXXZ", updatedAt: null };
export const defaultEvents = {
 quote_cta_clicked:"get_your_quote_clicked", whatsapp_cta_clicked:"whatsapp_us_clicked",
 form_started:"form_started",
 form_step_1_completed:"form_step_1_completed", form_step_2_completed:"form_step_2_completed",
 form_step_3_completed:"form_step_3_completed", form_step_4_completed:"form_step_4_completed",
 form_step_5_completed:"form_step_5_completed", form_step_6_completed:"form_step_6_completed",
 form_step_7_completed:"form_step_7_completed", form_step_8_completed:"form_step_8_completed",
 form_step_9_completed:"form_step_9_completed",
 form_validation_error:"form_validation_error", form_submitted:"form_submitted",
 form_submission_failed:"form_submission_failed"
};
export const metaStandardEvents = ["PageView","AddPaymentInfo","AddToCart","AddToWishlist","CompleteRegistration","Contact","CustomizeProduct","Donate","FindLocation","InitiateCheckout","Lead","Purchase","Schedule","Search","StartTrial","SubmitApplication","Subscribe","ViewContent"] as const;
export async function readEventNames(): Promise<Record<string,string>> {
 const names:Record<string,string>={...defaultEvents};
 try {
  const result=await database().prepare("SELECT event_key, meta_event_name FROM event_config").all<{event_key:string;meta_event_name:string}>();
  for(const row of result.results||[]) if(row.event_key in names) names[row.event_key]=row.meta_event_name;
 } catch {}
 return names;
}
export function database() {
 if (!env.DB) throw new Error("Tracking storage is unavailable");
 return env.DB;
}
export async function readSettings(): Promise<TrackingSettings> {
 const row = await database().prepare("SELECT meta_pixel_id AS metaPixelId, gtm_id AS gtmId, updated_at AS updatedAt FROM tracking_settings WHERE id = 1").first<TrackingSettings>();
 return row ?? { ...defaults };
}
import { isAdmin } from "./admin-session";
export { isAdmin };
export function validateSettings(input: unknown): { metaPixelId: string; gtmId: string } | null {
 if (!input || typeof input !== "object" || Array.isArray(input)) return null;
 const value = input as Record<string, unknown>;
 if (typeof value.metaPixelId !== "string" || typeof value.gtmId !== "string") return null;
 const metaPixelId = value.metaPixelId.trim();
 const gtmId = value.gtmId.trim().toUpperCase();
 if (metaPixelId && !/^\d{5,25}$/.test(metaPixelId)) return null;
 if (gtmId && !/^GTM-[A-Z0-9]{4,20}$/.test(gtmId)) return null;
 return { metaPixelId, gtmId };
}
export function requestIsAdmin(request: Request) { return isAdmin(request); }
export function eventId(prefix = "evt") { return `${prefix}_${crypto.randomUUID()}`; }
export const privateHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
