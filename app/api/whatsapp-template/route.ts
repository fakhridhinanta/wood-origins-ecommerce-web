import { database } from "../../../lib/tracking";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 try {
  const u=new URL(request.url);
  const values=[u.searchParams.get("campaign")||"",u.searchParams.get("adset")||"",u.searchParams.get("ad")||""];
  const row=await database().prepare("SELECT id, message FROM whatsapp_templates WHERE lower(campaign_name)=? AND lower(ad_set_name)=? AND lower(ad_name)=? AND status='active' ORDER BY updated_at DESC LIMIT 1").bind(...values.map(v=>v.trim().toLowerCase())).first<{id:number;message:string}>();
  return Response.json({matched:!!row,hashcode:row?.message||""},{headers:{"Cache-Control":"no-store"}});
 } catch { return Response.json({matched:false,hashcode:""},{headers:{"Cache-Control":"no-store"}}); }
}
