import page from "../../../templates/admin-login.template?raw";
import { authHeaders, isAdmin, sameOrigin, allowLogin, credentialsMatch, createSession, cookie } from "../../../lib/admin-session";
export const dynamic="force-dynamic";
export async function GET(request: Request) {
 if(await isAdmin(request)) return Response.redirect(new URL("/admin",request.url),302);
 const code=new URL(request.url).searchParams.get("error");
 const message=code==="busy"?"Login is temporarily unavailable. Please try again later.":code==="limit"?"Too many attempts. Please try again in 15 minutes.":code?"Incorrect ID or password.":"";
 return new Response(page.replace("<!--ERROR-->",message?`<p class="error" role="alert">${message}</p>`:""),{headers:{...authHeaders,"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"frame-ancestors 'none'; form-action 'self'; base-uri 'none'"}});
}
export async function POST(request: Request) {
 if(!sameOrigin(request)) return new Response("Invalid request origin",{status:403,headers:authHeaders});
 const fail=(error:string)=>new Response(null,{status:303,headers:{...authHeaders,Location:"/admin/login?error="+error}});
 try {
  if(!(await allowLogin(request))) return fail("limit");
  const body=await request.text(); if(body.length>4096) return fail("invalid");
  const values=new URLSearchParams(body);
  if(!(await credentialsMatch(values.get("username")||"",values.get("password")||""))) return fail("invalid");
  return new Response(null,{status:303,headers:{...authHeaders,Location:"/admin","Set-Cookie":cookie(request,await createSession(),28800)}});
 } catch { return fail("busy"); }
}
