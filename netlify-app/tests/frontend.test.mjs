import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto, randomUUID } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import { prepareLanding } from '../scripts/frontend.mjs';

const original=await readFile(new URL('../../templates/landing.template',import.meta.url),'utf8');
const html=prepareLanding(original).replace('__META_PIXEL_ID__','').replaceAll('__GTM_ID__','').replace('__EVENT_NAMES__','{}');
function browser(query='?test=1&utm_source=Facebook_Ads&utm_medium=feed&utm_campaign=QA%20Campaign&utm_content=QA%20Ad&Ad_Set_Name=QA%20Set'){
  const dom=new JSDOM(html,{url:'https://wood-origins.example/'+query,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
  const w=dom.window, calls=[], targets=[];
  Object.defineProperty(w,'crypto',{value:{randomUUID,...webcrypto}});
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
  w.open=()=>{const target={location:{href:''}};targets.push(target);return target;};
  let fail=false;
  w.fetch=async(url,options={})=>{
    const body=options.body?JSON.parse(options.body):null;calls.push({url,body});
    if(url==='/api/leads'&&fail)return {ok:false,json:async()=>({error:'test failure'})};
    return {ok:true,json:async()=>url.startsWith('/api/whatsapp-template')?{matched:true,hashcode:'QA_HASH'}:{}};
  };
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
  for(const script of scripts){
    const expose=script.includes('function startWizard(')?`;window.__qa={start:startWizard,next:wizNext,back:wizBack,track,attribution,openWA,submitLead,state:()=>({step:wizStep,flow:wizFlow,answers:wizAns}),answer:(key,value)=>{wizAns[key]=value;}};`:'';
    w.eval(script+expose);
  }
  return {dom,w,qa:w.__qa,calls,targets,fail:(value)=>{fail=value;}};
}
test('quote form tracks steps once and preserves first-touch UTM',async()=>{
  const {dom,w,qa,calls,targets}=browser();
  qa.start('quote');
  let result=false;
  while(!result){
    const {step,flow}=qa.state(),current=flow.steps[step];
    if(current.type==='result'){result=true;break;}
    if(current.type==='single')qa.answer(current.key,current.key==='existing'?'Parquet / timber':current.opts[0]);
    if(current.type==='contact'){
      await qa.next();assert.equal(qa.state().step,step,'invalid contact does not advance');
      qa.answer('name','QA Tester');qa.answer('phone','+65 8888 9999');qa.answer('consent',true);
    }
    await qa.next();
  }
  const events=calls.filter(c=>c.url==='/api/events').map(c=>c.body);
  for(const key of ['page_view','get_your_quote_clicked','form_started','form_submitted','form_validation_error'])assert(events.some(e=>e.eventType===key),key);
  for(const step of [1,2,3,4,6,7,8,9])assert.equal(events.filter(e=>e.eventType===`form_step_${step}_completed`).length,1,`step ${step}`);
  assert.equal(events.filter(e=>e.eventType==='form_step_5_completed').length,0,'conditional step skipped');
  assert.equal(calls.filter(c=>c.url==='/api/leads').length,1);
  const lead=calls.find(c=>c.url==='/api/leads').body;assert.equal(lead.campaignName,'QA Campaign');assert.equal(lead.adSetName,'QA Set');assert.equal(lead.adName,'QA Ad');assert.equal(lead.testLive,true);
  qa.back();await qa.next();assert.equal(calls.filter(c=>c.url==='/api/leads').length,1,'going back does not resubmit');
  assert.equal(calls.filter(c=>c.url==='/api/events'&&c.body.eventType==='form_step_9_completed').length,1);
  w.history.replaceState(null,'','/?utm_campaign=Later%20Campaign');assert.equal(qa.attribution().campaignName,'QA Campaign');
  await qa.openWA('Original WhatsApp message');assert(targets[0].location.href.includes('Reference%3A%20QA_HASH'));assert(targets[0].location.href.includes('Original%20WhatsApp%20message'));
  assert.equal(w.fbq,undefined,'test visit does not initialize Meta Pixel');
  assert(calls.every(c=>!String(c.url).includes('connect.pabbly.com')),'no browser webhook delivery');
  dom.window.close();
});
test('failed quote retains contact step; retry reuses ID and fires success once',async()=>{
  const {dom,qa,calls,fail}=browser();qa.start('quote');fail(true);
  while(qa.state().flow.steps[qa.state().step].type!=='contact'){
    const current=qa.state().flow.steps[qa.state().step];if(current.type==='single')qa.answer(current.key,current.opts[0]);await qa.next();
  }
  qa.answer('name','QA Tester');qa.answer('phone','+65 8888 9999');qa.answer('consent',true);
  await qa.next();assert.equal(qa.state().flow.steps[qa.state().step].type,'contact');
  fail(false);await Promise.all([qa.next(),qa.next()]);assert.equal(qa.state().flow.steps[qa.state().step].type,'result');
  const posts=calls.filter(c=>c.url==='/api/leads');assert.equal(posts.length,2);assert.equal(posts[0].body.submissionId,posts[1].body.submissionId);
  assert.equal(calls.filter(c=>c.url==='/api/events'&&c.body.eventType==='form_submitted').length,1);
  assert.equal(calls.filter(c=>c.url==='/api/events'&&c.body.eventType==='form_submission_failed').length,1);
  dom.window.close();
});
