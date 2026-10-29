import { database } from "../../../lib/tracking";
export const dynamic="force-dynamic";
const normalize=(value:string)=>value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
type Template={id:number;campaign_name:string;ad_set_name:string;ad_name:string;message:string};
const unique=(rows:Template[])=>rows.length===1?rows[0]:null;
export async function GET(request:Request){
 try {
  const u=new URL(request.url);
  const values=[u.searchParams.get("campaign")||"",u.searchParams.get("adset")||"",u.searchParams.get("ad")||""];
  const db=database();
  let row:Template|null=null;
  // Match values from the current landing URL first, regardless of parameter names.
  // This also avoids a previously stored campaign selecting an older hashcode.
  const landing=u.searchParams.get("landing")||"";
  if(landing.length<=12000){
   const pageValues=new Set([...new URLSearchParams(landing).values()].map(normalize).filter(Boolean));
   if(pageValues.size){
    const result=await db.prepare("SELECT id, campaign_name, ad_set_name, ad_name, message FROM whatsapp_templates WHERE status='active'").all<Template>();
    const templates=result.results||[];
    row=unique(templates.filter(t=>pageValues.has(normalize(t.campaign_name))&&pageValues.has(normalize(t.ad_set_name))&&pageValues.has(normalize(t.ad_name))));
    if(!row) row=unique(templates.filter(t=>normalize(t.ad_name).length>=12&&pageValues.has(normalize(t.ad_name))));
   }
  }
  if(!row) row=await db.prepare("SELECT id, campaign_name, ad_set_name, ad_name, message FROM whatsapp_templates WHERE lower(campaign_name)=? AND lower(ad_set_name)=? AND lower(ad_name)=? AND status='active' ORDER BY updated_at DESC LIMIT 1").bind(...values.map(v=>v.trim().toLowerCase())).first<Template>();
  if(!row&&values[2].trim()){
   const result=await db.prepare("SELECT id, campaign_name, ad_set_name, ad_name, message FROM whatsapp_templates WHERE status='active'").all<Template>();
   const templates=result.results||[];
   const [campaign,adset,ad]=values.map(normalize);
   if(campaign&&adset&&ad) row=unique(templates.filter(t=>normalize(t.campaign_name)===campaign&&normalize(t.ad_set_name)===adset&&normalize(t.ad_name)===ad));
   // An ad name reused in multiple campaigns is ambiguous; leave it unmatched.
   if(!row&&ad.length>=12) row=unique(templates.filter(t=>normalize(t.ad_name)===ad));
  }
  return Response.json({matched:!!row,hashcode:row?.message||""},{headers:{"Cache-Control":"no-store"}});
 } catch { return Response.json({matched:false,hashcode:""},{headers:{"Cache-Control":"no-store"}}); }
}
