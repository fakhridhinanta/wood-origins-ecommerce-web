import { authHeaders, sameOrigin, deleteSession, cookie } from "../../../lib/admin-session";
export const dynamic="force-dynamic";
export async function POST(request: Request) {
 if(!sameOrigin(request)) return new Response("Invalid request origin",{status:403,headers:authHeaders});
 try { await deleteSession(request); } catch { return new Response("Could not log out. Please try again.",{status:503,headers:authHeaders}); }
 return new Response(null,{status:303,headers:{...authHeaders,Location:"/admin/login","Set-Cookie":cookie(request,"",0)}});
}
