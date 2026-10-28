import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import api from '../api/index.js';
const root=new URL('../',import.meta.url);
const response=(path,method='GET')=>api.fetch(new Request('https://idollog.example'+path,{method}));

test('Vercel build publishes complete browser assets without backend data',async()=>{
  execFileSync(process.execPath,['scripts/build-vercel.mjs'],{cwd:root,windowsHide:true});
  const config=JSON.parse(await readFile(new URL('vercel.json',root),'utf8'));
  assert.equal(config.outputDirectory,'public');
  assert.equal(config.buildCommand,'npm run build:vercel');
  assert.equal(config.functions['api/index.js'].maxDuration,60);
  for(const file of ['index.html','styles.css','brand.css','app.js']){
    assert.deepEqual(await readFile(new URL('public/'+file,root)),await readFile(new URL('frontend/'+file,root)));
  }
  assert.deepEqual((await readdir(new URL('public/',root))).sort(),['app.js','brand.css','index.html','styles.css']);
});

test('Vercel rewrite preserves API route, Korean queries, filters and MV links',async()=>{
  const config=JSON.parse(await readFile(new URL('vercel.json',root),'utf8'));
  const rewrite=config.rewrites.find(rule=>rule.source==='/api/:path*');
  const routed=(route,query={})=>{
    const target=new URL(rewrite.destination.replace(':path*',route),'https://idollog.example');
    for(const [key,value] of Object.entries(query))target.searchParams.set(key,value);
    return api.fetch(new Request(target));
  };
  assert.deepEqual(await (await routed('health')).json(),{ok:true});
  const tags=await (await routed('tags')).json();assert.equal(tags.groups.length,3);
  const songs=await (await routed('recommendations',{year:'all',q:'하츠투하츠 Lemon Tang',limit:'100'})).json();
  assert.ok(songs.songs.some(song=>song.video?.id==='1VqxWNwgf5Q'));
  const news=await (await routed('news',{month:'2026-10'})).json();assert.ok(news.events.length>=15);
  const mix=await (await routed('surprise',{seed:'vercel-test'})).json();assert.equal(mix.selected.length,3);
  const hero=await (await routed('hero',{seed:'vercel-test'})).json();assert.equal(hero.photos.length,2);
  assert.equal((await routed('recommendations',{year:'invalid'})).status,400);
  assert.equal((await routed('unknown')).status,404);
});

test('Vercel entry also handles original paths and rejects unsupported methods',async()=>{
  assert.deepEqual(await (await response('/api/health')).json(),{ok:true});
  assert.equal((await response('/api/health','POST')).status,405);
  assert.equal((await response('/api?__idollog_path=health','POST')).status,405);
  assert.equal((await response('/api?__idollog_path=calendar&month=invalid')).status,400);
  assert.equal((await response('/api/not-found')).status,404);
});
