import { env } from './database.mjs';
import { isAdmin } from '../../lib/admin-session.ts';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request){
  if(!(await isAdmin(request)))return json({error:'Administrator sign-in required.'},403);
  const params=new URL(request.url).searchParams;
  const from=params.get('from')||'',to=params.get('to')||'',mode=params.get('mode')||'';
  const date=value=>!value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
  if(!date(from)||!date(to)||(from&&to&&from>to)||!['','live','test'].includes(mode))return json({error:'Invalid analytics filter.'},400);
  const nextDay=to?new Date(Date.parse(to)+86400000).toISOString():'';
  const where="WHERE (?='' OR timestamp>=?) AND (?='' OR timestamp<?) AND (?='' OR test_live=?)";
  const bounds=[from,from,to,nextDay,mode,mode];
  const db=env.DB;
  try{
    const [groups,counts,leads]=await Promise.all([
      db.prepare(`SELECT event_name,event_type,campaign_name,ad_set_name,ad_name,COUNT(*) AS result FROM website_events ${where} GROUP BY event_name,event_type,campaign_name,ad_set_name,ad_name ORDER BY result DESC,event_name LIMIT 5000`).bind(...bounds).all(),
      db.prepare(`SELECT event_type,COUNT(*) AS result FROM website_events ${where} GROUP BY event_type`).bind(...bounds).all(),
      db.prepare('SELECT * FROM leads ORDER BY submitted_at DESC LIMIT 5000').all(),
    ]);
    return json({groups:groups.results,counts:counts.results,leads:leads.results});
  }catch{return json({error:'Could not load analytics.'},503);}
}
