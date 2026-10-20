import { env } from "cloudflare:workers";
const COOKIE = "wo_admin_session";
export const authHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin" };
export async function digest(value: string) {
 const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,"0")).join("");
}
export async function credentialsMatch(id: string, password: string) {
 if (!env.ADMIN_LOGIN_ID || !env.ADMIN_LOGIN_PASSWORD) return false;
 const [a,b] = await Promise.all([digest(JSON.stringify([id,password])),digest(JSON.stringify([env.ADMIN_LOGIN_ID,env.ADMIN_LOGIN_PASSWORD]))]);
 let difference=0; for(let i=0;i<a.length;i++) difference |= a.charCodeAt(i)^b.charCodeAt(i);
 return difference===0;
}
function token(request: Request) { return request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(COOKIE+"="))?.slice(COOKIE.length+1) || ""; }
export async function isAdmin(request: Request) {
 const value=token(request); if(!/^[a-f0-9]{64}$/.test(value) || !env.DB) return false;
 try { const row=await env.DB.prepare("SELECT expires_at FROM admin_sessions WHERE token_hash = ?").bind(await digest(value)).first<{expires_at:number}>(); return Boolean(row && row.expires_at>Date.now()); } catch { return false; }
}
export function sameOrigin(request: Request) { return request.headers.get("origin")===new URL(request.url).origin; }
export function cookie(request: Request,value: string,maxAge: number) { return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==="https:"?"; Secure":""}`; }
export async function createSession() {
 if(!env.DB) throw new Error("Storage unavailable");
 const value=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
 await env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(Date.now()).run();
 await env.DB.prepare("INSERT INTO admin_sessions(token_hash,expires_at) VALUES (?,?)").bind(await digest(value),Date.now()+8*60*60*1000).run(); return value;
}
export async function deleteSession(request: Request) { if(env.DB) await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await digest(token(request))).run(); }
export async function allowLogin(request: Request) {
 if(!env.DB) throw new Error("Storage unavailable");
 const now=Date.now(), bucket=Math.floor(now/900000);
 const key=await digest((request.headers.get("cf-connecting-ip")||"local")+":"+bucket);
 await env.DB.prepare("DELETE FROM admin_login_attempts WHERE expires_at < ?").bind(now).run();
 const row=await env.DB.prepare("INSERT INTO admin_login_attempts(key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts").bind(key,(bucket+1)*900000).first<{attempts:number}>();
 return Boolean(row && row.attempts<=10);
}
