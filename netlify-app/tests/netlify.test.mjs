import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createDatabase, postgresQuery } from '../src/database.mjs';
import website from '../netlify/functions/website.mjs';
import { prepareLanding } from '../scripts/frontend.mjs';

const base = 'https://wood-origins.example';
const originalFetch = globalThis.fetch;
const pg = new PGlite();
const migration = await readFile(new URL('../netlify/database/migrations/0001_wood_origins.sql',import.meta.url),'utf8');
await pg.exec(migration);
await pg.exec(migration);
globalThis.__woTestDatabase = createDatabase(async(text,values)=>{
  try { const r=await pg.query(text,values);return {rows:r.rows,rowCount:r.affectedRows}; }
  catch(error) { console.error('SQL test error:',error.message);throw error; }
});
process.env.ADMIN_LOGIN_ID='test-admin';
process.env.ADMIN_LOGIN_PASSWORD='test-password';
process.env.PABBLY_WEBHOOK_URL='https://webhook.example/test';
const request=(path,options={})=>website(new Request(base+path,options),{ip:'192.0.2.1'});
const post=(path,body,headers={})=>request(path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const json=async r=>({status:r.status,body:await r.json()});
const lead=(id='submission-test-001',extra={})=>({submissionId:id,name:'QA Tester',phone:'+65 8888 9999',testLive:true,answers:{kind:'quote_submitted',consent:true,rooms:[{name:'Bedroom',w:3,l:4}],scope:'Whole home',skirting:'Yes — recommended'},campaignName:'QA Campaign',adSetName:'QA Ad Set',adName:'QA Ad',utmSource:'Facebook_Ads',utmMedium:'feed',utmContent:'QA Ad',sessionId:'session-test-001',...extra});

test('Netlify application against real Postgres SQL',async t=>{
  await t.test('SQL adapter uses parameters and preserves aliases',()=>{
    assert.equal(postgresQuery('SELECT value AS metaPixelId WHERE id=?'),'SELECT value AS "metaPixelId" WHERE id=$1');
    assert.equal(postgresQuery('INSERT OR IGNORE INTO leads(id) VALUES (?)'),'INSERT INTO leads(id) VALUES ($1) ON CONFLICT DO NOTHING');
  });
  await t.test('public site renders; admin and APIs require authentication',async()=>{
    const home=await request('/');assert.equal(home.status,200);const html=await home.text();assert(html.includes('Valley Oak'));assert(!html.includes('connect.pabbly.com/webhook-listener'));assert(!html.includes('__META_PIXEL_ID__'));
    const admin=await request('/admin');assert.equal(admin.status,302);assert.equal(admin.headers.get('location'),base+'/admin/login');
    const login=await request('/admin/login');assert.equal(login.status,200);assert((await login.text()).includes('autocomplete="current-password"'));
    for(const path of ['/api/admin/analytics','/api/admin/tracking','/api/admin/config'])assert.equal((await request(path)).status,403);
    const head=await request('/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  });
  let cookie;
  await t.test('login rejects wrong credentials and cross-site requests, then creates secure session',async()=>{
    assert.equal((await post('/admin/login',{} ,{Origin:'https://other.example'})).status,403);
    const login=async password=>request('/admin/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:'test-admin',password})});
    const wrong=await login('wrong');assert.equal(wrong.status,303);assert(wrong.headers.get('location').includes('error=invalid'));assert(!wrong.headers.has('set-cookie'));
    const good=await login('test-password');assert.equal(good.headers.get('location'),'/admin');const value=good.headers.get('set-cookie');assert(value.includes('HttpOnly'));assert(value.includes('SameSite=Strict'));assert(value.includes('Secure'));cookie=value.split(';')[0];
    assert.equal((await request('/admin',{headers:{Cookie:cookie}})).status,200);
    assert.equal((await request('/api/admin/analytics',{headers:{Cookie:'wo_admin_session='+'0'.repeat(64)}})).status,403);
  });
  const write=(path,body,method='PUT',origin=base)=>request(path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
  await t.test('tracking IDs persist and inject into future page loads',async()=>{
    let r=await write('/api/admin/tracking',{metaPixelId:'123456789',gtmId:'gtm-abcd123'});assert.equal(r.status,200);
    const settings=await (await request('/api/admin/tracking',{headers:{Cookie:cookie}})).json();assert.equal(settings.metaPixelId,'123456789');assert.equal(settings.gtmId,'GTM-ABCD123');
    const html=await (await request('/')).text();assert(html.includes("metaPixelId:'123456789'"));assert(html.includes("gtmId:'GTM-ABCD123'"));
    assert.equal((await write('/api/admin/tracking',{metaPixelId:'bad',gtmId:''})).status,400);
    assert.equal((await write('/api/admin/tracking',{metaPixelId:'',gtmId:''},'PUT','https://attacker.example')).status,403);
  });
  await t.test('standard/custom event names persist without altering event types',async()=>{
    assert.equal((await write('/api/admin/config',{events:{quote_cta_clicked:'Lead',form_started:'CustomFormStart'}})).status,200);
    const html=await (await request('/')).text();assert(html.includes('"quote_cta_clicked":"Lead"'));assert(html.includes('"form_started":"CustomFormStart"'));
    assert.equal((await write('/api/admin/config',{events:{quote_cta_clicked:'</script>'}})).status,400);
  });
  let templateId;
  await t.test('WhatsApp template create, case-insensitive exact match, edit and fallback',async()=>{
    const template={campaignName:'QA Campaign',adSetName:'QA Ad Set',adName:'QA Ad',hashcode:'QA_HASH_001'};
    assert.equal((await write('/api/admin/config',{template})).status,200);
    const config=await (await request('/api/admin/config',{headers:{Cookie:cookie}})).json();templateId=config.templates[0].id;
    let match=await (await request('/api/whatsapp-template?campaign=qa%20campaign&adset=QA%20AD%20SET&ad=qa%20ad')).json();assert.equal(match.hashcode,'QA_HASH_001');
    assert.equal((await write('/api/admin/config',{template:{...template,id:templateId,hashcode:'QA_UPDATED'}})).status,200);
    match=await (await request('/api/whatsapp-template?campaign=qa%20campaign&adset=qa%20ad%20set&ad=qa%20ad')).json();assert.equal(match.hashcode,'QA_UPDATED');
    assert.deepEqual(await (await request('/api/whatsapp-template?campaign=no-match')).json(),{matched:false,hashcode:''});
  });
  await t.test('test leads persist with answers and UTM; duplicate ID creates one record and sends no webhook',async()=>{
    let sends=0;globalThis.fetch=async()=>{sends++;return new Response('ok')};
    for(let i=0;i<2;i++)assert.equal((await post('/api/leads',lead())).status,200);
    assert.equal(sends,0);
    const records=await pg.query('SELECT * FROM leads WHERE submission_id=$1',['submission-test-001']);assert.equal(records.rows.length,1);assert.equal(records.rows[0].test_live,'test');
    const answers=JSON.parse(records.rows[0].answers);assert.equal(answers.rooms[0].name,'Bedroom');assert.equal(answers.utm_campaign,'QA Campaign');assert.equal(answers.Ad_Set_Name,'QA Ad Set');
    assert.equal((await post('/api/leads',lead('submission-test-001',{name:'Changed name'}))).status,409);
    assert.equal((await post('/api/leads',lead('bad'))).status,400);
    assert.equal((await post('/api/leads',lead('submission-no-consent',{answers:{kind:'quote_submitted',consent:false}}))).status,400);
  });
  await t.test('live Pabbly request is server-side and idempotent for duplicate submissions',async()=>{
    let sends=0;
    globalThis.fetch=async(url,options)=>{sends++;assert.equal(url,'https://webhook.example/test');assert.equal(options.body.get('campaignName'),'QA Campaign');assert.equal(options.body.get('utm_campaign'),'QA Campaign');assert.equal(options.body.get('Ad_Set_Name'),'QA Ad Set');return new Response('ok')};
    for(let i=0;i<2;i++)assert.equal((await post('/api/leads',lead('submission-live-001',{testLive:false}))).status,200);
    assert.equal(sends,1);
  });
  await t.test('failed delivery is visible and can retry with same submission ID',async()=>{
    globalThis.fetch=async()=>new Response('fail',{status:500});
    assert.equal((await post('/api/leads',lead('submission-retry-001',{testLive:false}))).status,503);
    globalThis.fetch=async()=>new Response('ok');
    assert.equal((await post('/api/leads',lead('submission-retry-001',{testLive:false}))).status,200);
    assert.equal((await pg.query('SELECT COUNT(*)::int AS count FROM leads WHERE submission_id=$1',['submission-retry-001'])).rows[0].count,1);
  });
  await t.test('concurrent live submission produces one lead and one webhook call',async()=>{
    let sends=0;globalThis.fetch=async()=>{sends++;await new Promise(r=>setTimeout(r,30));return new Response('ok')};
    const results=await Promise.all([post('/api/leads',lead('submission-concurrent-001',{testLive:false})),post('/api/leads',lead('submission-concurrent-001',{testLive:false}))]);
    assert(results.some(r=>r.status===200));assert(results.every(r=>[200,409].includes(r.status)));assert.equal(sends,1);
  });
  await t.test('events group correctly, preserve test/live status, and respect date filtering',async()=>{
    const event={eventId:'event-test-001',eventName:'Lead',eventType:'get_your_quote_clicked',sessionId:'session-test-001',timestamp:'2026-10-21T12:00:00.000Z',campaignName:'QA Campaign',adSetName:'QA Ad Set',adName:'QA Ad',testLive:true};
    for(let i=0;i<2;i++)assert.equal((await post('/api/events',event)).status,200);
    assert.equal((await post('/api/events',{...event,eventId:'event-test-002',eventType:'form_started',eventName:'CustomFormStart'})).status,200);
    const analytics=await (await request('/api/admin/analytics?from=2026-10-21&to=2026-10-21',{headers:{Cookie:cookie}})).json();
    assert.equal(Number(analytics.counts.find(r=>r.event_type==='get_your_quote_clicked').result),1);assert.equal(analytics.groups.find(r=>r.event_name==='Lead').campaign_name,'QA Campaign');assert(analytics.leads.some(r=>r.test_live==='test'));assert(analytics.leads.some(r=>r.test_live==='live'));
    const empty=await (await request('/api/admin/analytics?from=2025-01-01&to=2025-01-02',{headers:{Cookie:cookie}})).json();assert.equal(empty.groups.length,0);
    const live=await (await request('/api/admin/analytics?mode=live',{headers:{Cookie:cookie}})).json();assert.equal(live.groups.length,0,'test events excluded from live analytics');
    const testOnly=await (await request('/api/admin/analytics?mode=test',{headers:{Cookie:cookie}})).json();assert.equal(testOnly.groups.length,2);
    assert.equal((await request('/api/admin/analytics?from=2026-02-30',{headers:{Cookie:cookie}})).status,400);
    assert.equal((await request('/api/admin/analytics?from=invalid',{headers:{Cookie:cookie}})).status,400);
  });
  await t.test('delete template and logout revoke access',async()=>{
    assert.equal((await write('/api/admin/config',{id:templateId},'DELETE')).status,200);
    const response=await request('/admin/logout',{method:'POST',headers:{Origin:base,Cookie:cookie}});assert.equal(response.status,303);
    assert.equal((await request('/api/admin/analytics',{headers:{Cookie:cookie}})).status,403);
  });
  await t.test('login rate limit uses trusted Netlify IP and rejects repeated attempts',async()=>{
    let final;
    for(let i=0;i<11;i++)final=await request('/admin/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'username=bad&password=bad'});
    assert(final.headers.get('location').includes('error=limit'));
  });
  await t.test('public copy outside scripts remains byte-for-byte unchanged',async()=>{
    const original=await readFile(new URL('../../templates/landing.template',import.meta.url),'utf8');
    const strip=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');assert.equal(strip(original),strip(prepareLanding(original)));
  });
  globalThis.fetch=originalFetch;
  await pg.close();
});
