import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareLanding } from './frontend.mjs';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(app, '..');
await mkdir(resolve(app,'dist'),{recursive:true});
await mkdir(resolve(app,'generated'),{recursive:true});
await cp(resolve(root,'public'),resolve(app,'dist'),{recursive:true,filter:path=>!path.endsWith('.DS_Store')});
let adminScript=await readFile(resolve(root,'public/admin.js'),'utf8');
adminScript=adminScript.replace("const params=new URLSearchParams();if(el('dateFrom').value)","const params=new URLSearchParams();params.set('mode',el('analyticsMode').value);if(el('dateFrom').value)");
adminScript=adminScript.replace("['dateFrom','dateTo'].forEach", "['dateFrom','dateTo','analyticsMode'].forEach");
adminScript=adminScript.replace("leadCount=analytics.leads.filter(lead=>(!from", "leadCount=analytics.leads.filter(lead=>(!el('analyticsMode').value||lead.test_live===el('analyticsMode').value)&&(!from");
await writeFile(resolve(app,'dist/admin.js'),adminScript);
await build({
  entryPoints:[resolve(app,'src/entry.mjs')], outfile:resolve(app,'generated/handler.mjs'),
  platform:'node',format:'esm',target:'node22',bundle:true,packages:'external',
  plugins:[{
    name:'wood-origins-netlify-adapter',setup(plugin){
      plugin.onResolve({filter:/^cloudflare:workers$/},()=>({path:resolve(app,'src/database.mjs')}));
      plugin.onLoad({filter:/[/\\]lib[/\\]admin-session\.ts$/},async args=>{
        let contents=await readFile(args.path,'utf8');
        const start=contents.indexOf('export async function credentialsMatch('),end=contents.indexOf('function token(',start);
        if(start<0||end<0)throw Error('Admin login hook changed; review required.');
        contents=contents.slice(0,start)+'export { verifyCredentials as credentialsMatch } from '+JSON.stringify(resolve(app,'src/credentials.mjs'))+';\n'+contents.slice(end);
        return {contents,loader:'ts'};
      });
      plugin.onResolve({filter:/\.template\?raw$/},args=>({path:resolve(args.resolveDir,args.path.replace(/\?raw$/,'')),namespace:'template'}));
      plugin.onLoad({filter:/.*/,namespace:'template'},async args=>{
        let contents=await readFile(args.path,'utf8');
        if(args.path.endsWith('/landing.template')) contents=prepareLanding(contents);
        if(args.path.endsWith('/admin.template')) contents=contents.replace('<button type="button" class="save" id="refreshAnalytics">', '<label>Mode<select id="analyticsMode"><option value="live">Live</option><option value="test">Test</option><option value="">Test &amp; live</option></select></label><button type="button" class="save" id="refreshAnalytics">');
        return {contents:'export default '+JSON.stringify(contents),loader:'js'};
      });
    }
  }],
});
console.log('Built Netlify function and public assets. Public copy and layout preserved.');
