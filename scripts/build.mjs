// Bundle source into the dependency-free Sites Worker artifact. Local execution needs no build.
import {readFile, mkdir, writeFile, copyFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = p => readFile(new URL(p, root),'utf8');
const catalog = await read('backend/catalog.js');
const metadata = await read('backend/metadata.js');
const artistIds = await read('backend/artist-ids.js');
const api = (await read('backend/api.js')).replace(/^import .*?;\r?\n/gm, '');
const assets = {};
for (const [path,file,type] of [['/','index.html','text/html'],['/styles.css','styles.css','text/css'],['/app.js','app.js','text/javascript']]) {
  assets[path] = {body:await read(`frontend/${file}`), type:`${type}; charset=utf-8`};
}
const worker = `${catalog}\n${metadata}\n${artistIds}\n${api}\nconst assets = ${JSON.stringify(assets)};\nexport default {async fetch(request) {const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return handleApi(request);const asset=assets[url.pathname];if(!asset)return new Response('Not found',{status:404});if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff'}});}};`;
await mkdir(new URL('dist/server/',root),{recursive:true});
await mkdir(new URL('dist/.openai/',root),{recursive:true});
await writeFile(new URL('dist/server/index.js',root),worker);
await copyFile(new URL('.openai/hosting.json',root),new URL('dist/.openai/hosting.json',root));
console.log('Built dist/server/index.js');
