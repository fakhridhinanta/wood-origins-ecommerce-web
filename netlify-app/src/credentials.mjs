import { serverConfig } from './server-config.mjs';

function equal(a,b){
  if(a.length!==b.length)return false;
  let difference=0;
  for(let index=0;index<a.length;index++)difference|=a.charCodeAt(index)^b.charCodeAt(index);
  return difference===0;
}
async function passwordHash(id,password){
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(JSON.stringify([id,password])),{name:'PBKDF2'},false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(serverConfig.salt),iterations:serverConfig.iterations},material,256);
  return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function verifyCredentials(id,password){
  if(typeof id!=='string'||typeof password!=='string'||id.length>100||password.length>200)return false;
  const overrideId=process.env.ADMIN_LOGIN_ID,overridePassword=process.env.ADMIN_LOGIN_PASSWORD;
  if(overrideId||overridePassword){
    if(!overrideId||!overridePassword)return false;
    const [actual,expected]=await Promise.all([passwordHash(id,password),passwordHash(overrideId,overridePassword)]);
    return equal(actual,expected);
  }
  return equal(await passwordHash(id,password),serverConfig.passwordHash);
}

export function webhookUrl(){ return process.env.PABBLY_WEBHOOK_URL || serverConfig.pabblyWebhookUrl; }
