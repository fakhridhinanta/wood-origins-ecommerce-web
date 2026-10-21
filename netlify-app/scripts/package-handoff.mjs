import { cp, mkdir, mkdtemp, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const app=resolve(dirname(fileURLToPath(import.meta.url)),'..'),root=resolve(app,'..');
const stage=await mkdtemp(resolve(tmpdir(),'wood-origins-netlify-source-'));
const output=resolve(root,'Netlify Handoff');await mkdir(output,{recursive:true});
const archive=resolve(output,'wood-origins-netlify-preconfigured-2026-10-21.zip');
if(existsSync(archive))throw Error('A handoff archive already exists. Keep it and choose a new version name before replacing.');
const selected=[
 'netlify.toml','NETLIFY-SETUP.md','NETLIFY-VERIFICATION.md','CLIENT-NETLIFY-MESSAGE.txt',
 'app/route.ts','app/admin/route.ts','app/admin/login/route.ts','app/admin/logout/route.ts',
 'app/api/events/route.ts','app/api/admin/config/route.ts','app/api/admin/tracking/route.ts',
 'app/api/whatsapp-template/route.ts','lib/tracking.ts','lib/admin-session.ts',
 'templates/landing.template','templates/admin.template','templates/admin-login.template','public',
];
for(const name of selected){
 const target=resolve(stage,name);await mkdir(dirname(target),{recursive:true});
 await cp(resolve(root,name),target,{recursive:true,filter:path=>!path.endsWith('.DS_Store')});
}
await cp(app,resolve(stage,'netlify-app'),{recursive:true,filter:path=>{
 const relative=path.slice(app.length).split('/');
 return !relative.some(segment=>['node_modules','dist','generated','.netlify','.DS_Store'].includes(segment));
}});
const template=resolve(stage,'templates/landing.template');
await writeFile(template,(await readFile(template,'utf8')).replace(/leadWebhook:'[^']*'/,"leadWebhook:''"));
await cp(resolve(app,'REPOSITORY-README.md'),resolve(stage,'README.md'));
await writeFile(resolve(stage,'.gitignore'),'node_modules/\nnetlify-app/dist/\nnetlify-app/generated/\n.netlify/\n.env*\n.DS_Store\n');
const zip=spawnSync('/usr/bin/zip',['-qr',archive,'.'],{cwd:stage,encoding:'utf8'});
if(zip.status!==0)throw Error(zip.stderr||'ZIP creation failed');
console.log(JSON.stringify({archive,bytes:(await stat(archive)).size,verificationSource:stage}));
