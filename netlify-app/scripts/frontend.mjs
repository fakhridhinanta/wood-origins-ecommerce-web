// Change behavior only inside script blocks. Approved public copy and layout stay intact.
export function prepareLanding(original) {
  let html = original.replace(/leadWebhook:'[^']*'/, "leadWebhook:''");
  const start = html.indexOf('let leadSubmitting=false;');
  const end = html.indexOf('/* ===================================================================================== */', start);
  if (start < 0 || end < 0) throw Error('Landing submission hooks changed; review required.');
  html = html.slice(0,start) + `let leadSubmitting=false, leadPromise=null, quoteSubmissionId=null, wizNextBusy=false;
function submitLead(kind,data){
 if(leadPromise)return leadPromise;
 leadSubmitting=true;
 const submissionId=kind==='quote_submitted'?(quoteSubmissionId||(quoteSubmissionId=crypto.randomUUID())):crypto.randomUUID();
 const d=Object.assign({kind,source:'lvt-lp',page:location.href,submissionId},attribution(),data||{});
 leadPromise=(async()=>{try{
  const response=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionId,name:d.name,phone:d.phone,email:d.email,answers:d,testLive:IS_TEST,...attribution()})});
  if(!response.ok)throw Error('Lead could not be saved');
  if(kind==='quote_submitted')track('form_submitted',{leadId:submissionId,pageSection:'quote'});
  return submissionId;
 }catch(e){leadSubmitting=false;leadPromise=null;track('form_submission_failed',{leadId:submissionId,pageSection:'quote'});toast('Your quote could not be sent. Please try again.');throw e;}})();
 return leadPromise;
}
` + html.slice(end);
  html = html.replace('leadSubmitting=false;completedQuoteSteps=new Set();', 'leadSubmitting=false;leadPromise=null;quoteSubmissionId=null;wizNextBusy=false;completedQuoteSteps=new Set();');
  html = html.replace('function wizNext(){ const step=wizFlow.steps[wizStep];', 'async function wizNext(){ if(wizNextBusy)return; const step=wizFlow.steps[wizStep];');
  const complete = "  if(wizKey==='quote'&&!completedQuoteSteps.has(wizStep))";
  if (!html.includes(complete)) throw Error('Form step hook changed; review required.');
  html = html.replace(complete, `  if(wizKey==='quote'&&step.type==='contact'){
    wizNextBusy=true;const next=document.getElementById('wizNext');if(next)next.disabled=true;
    try{await wizCapture();}catch(e){if(next)next.disabled=false;wizNextBusy=false;return;}
    wizNextBusy=false;
  }
` + complete);
  const captureStart = html.indexOf('function wizCapture(){');
  const captureEnd = html.indexOf('function wizSend(){', captureStart);
  if (captureStart < 0 || captureEnd < 0) throw Error('Form capture hook changed; review required.');
  html = html.slice(0,captureStart) + `async function wizCapture(){
 if(wizSent)return leadPromise;
 wizSent=true;
 const nm=wizAns.name||'',ph=wizAns.phone||'';
 if(wizKey==='quote')try{return await submitLead('quote_submitted',{...wizAns,name:nm,phone:ph,sku:sku.name,rooms:WROOMS});}catch(e){wizSent=false;throw e;}
}
` + html.slice(captureEnd);
  html = html.replace('    wizCapture();', '    wizCapture().catch(()=>{});');
  // A separate test visit records test events locally without sending marketing events.
  html = html.replace('if(CONFIG.gtmId){window.dataLayer', "if(new URLSearchParams(location.search).get('test')!=='1'&&CONFIG.gtmId){window.dataLayer");
  html = html.replace('if(CONFIG.metaPixelId){!function', "if(new URLSearchParams(location.search).get('test')!=='1'&&CONFIG.metaPixelId){!function");
  html = html.replace('if(window.fbq){if(META_STANDARD', 'if(!IS_TEST&&window.fbq){if(META_STANDARD');
  html = html.replace('if(CONFIG.gtmId){window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:name', 'if(!IS_TEST&&CONFIG.gtmId){window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:name');
  return html;
}
