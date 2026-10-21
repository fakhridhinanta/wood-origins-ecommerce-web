// Local validation server. Use `netlify dev` when testing the real Netlify platform.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createDatabase } from '../src/database.mjs';
import website from '../netlify/functions/website.mjs';
const pg = new PGlite();
await pg.exec(await readFile(new URL('../netlify/database/migrations/0001_wood_origins.sql',import.meta.url),'utf8'));
globalThis.__woTestDatabase=createDatabase(async(text,values)=>{const result=await pg.query(text,values);return {rows:result.rows,rowCount:result.affectedRows};});
if(!process.env.ADMIN_LOGIN_ID||!process.env.ADMIN_LOGIN_PASSWORD)throw Error('Set ADMIN_LOGIN_ID and ADMIN_LOGIN_PASSWORD for local testing.');
const port=Number(process.env.PORT||8877);
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(/\.(js|svg|jpg|png|webp|ico)$/.test(url.pathname)){
      const target=resolve('dist','.'+decodeURIComponent(url.pathname));
      if(!target.startsWith(resolve('dist')+'/'))throw Error('Invalid path');
      const bytes=await readFile(target);res.setHeader('Content-Type',({'.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'}[extname(target)]||'application/octet-stream'));res.end(bytes);return;
    }
    const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
    const response=await website(request,{ip:'127.0.0.1'});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port} — temporary test database; use ?test=1`));
