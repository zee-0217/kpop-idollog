import test from 'node:test';
import assert from 'node:assert/strict';
import {handleApi} from '../backend/api.js';
import {tags, catalog, recommend} from '../backend/catalog.js';
const request=(path,method='GET')=>handleApi(new Request(`https://example.test${path}`,{method}));
test('all 64 tag combinations use exact AND matching without padded results',()=>{
  for(let mask=0;mask<2**tags.length;mask++){
    const selected=tags.filter((_,i)=>mask&(1<<i)),actual=recommend(selected);
    assert.deepEqual(actual,catalog.filter(song=>selected.every(tag=>song.tags.includes(tag))));
    assert.equal(new Set(actual.map(song=>song.id)).size,actual.length);
  }
  assert.ok(recommend(['몽환','댄스']).length>=10);
  for(const tag of tags)assert.ok(recommend([tag]).length>=10,tag);
  assert.equal(recommend(['댄스','발라드']).length,0);
});
test('recommendation API deduplicates tags and exposes honest empty results',async()=>{
  const response=await request('/api/recommendations?tags='+encodeURIComponent('몽환,댄스,몽환'));
  assert.equal(response.status,200);const data=await response.json();
  assert.deepEqual(data.selected,['몽환','댄스']);assert.ok(data.total>=10);
  assert.ok(data.songs.every(song=>song.tags.includes('몽환')&&song.tags.includes('댄스')));
  const empty=await (await request('/api/recommendations?tags='+encodeURIComponent('댄스,발라드'))).json();
  assert.equal(empty.total,0);assert.equal(empty.enough,false);
});
test('API rejects malformed dates, unknown tags/artists, methods and routes',async()=>{
  for(const path of ['/api/calendar?month=2026-13','/api/calendar?month=26-10','/api/calendar?month=2026-02-01','/api/recommendations?tags=unknown','/api/artist?name=unknown'])assert.equal((await request(path)).status,400,path);
  assert.equal((await request('/api/nope')).status,404);
  assert.equal((await request('/api/health','POST')).status,405);
});
test('calendar handles leap year, removes unrelated/undated/live releases, and caches',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async url=>{
    calls++;assert.ok(new URL(url).searchParams.get('query').includes('2024-02-29'));
    return Response.json({count:6,'release-groups':[
      {id:'valid',title:'New EP','first-release-date':'2024-02-12','primary-type':'EP','artist-credit':[{artist:{name:'aespa',id:'b51c672b-85e0-48fe-8648-470a2422229f'}}]},
      {id:'partial',title:'No day','first-release-date':'2024-02','primary-type':'Single','artist-credit':[{artist:{name:'aespa',id:'b51c672b-85e0-48fe-8648-470a2422229f'}}]},
      {id:'other',title:'Other month','first-release-date':'2024-03-01','primary-type':'Single','artist-credit':[{artist:{name:'aespa',id:'b51c672b-85e0-48fe-8648-470a2422229f'}}]},
      {id:'unrelated',title:'Other artist','first-release-date':'2024-02-12','primary-type':'Album','artist-credit':[{artist:{name:'Unrelated'}}]},
      {id:'same-name',title:'Wrong identity','first-release-date':'2024-02-12','primary-type':'Album','artist-credit':[{artist:{name:'aespa',id:'different-artist-id'}}]},
      {id:'live',title:'Live','first-release-date':'2024-02-12','primary-type':'Album','secondary-types':['Live'],'artist-credit':[{artist:{name:'aespa',id:'b51c672b-85e0-48fe-8648-470a2422229f'}}]}
    ]});
  });
  const first=await (await request('/api/calendar?month=2024-02')).json();assert.equal(first.events.length,1);assert.equal(first.events[0].id,'valid');
  const again=await (await request('/api/calendar?month=2024-02')).json();assert.equal(calls,1);assert.equal(again.cached,true);
});
test('external failure is an error rather than an empty successful calendar',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('network unavailable');});
  const response=await request('/api/calendar?month=2023-01');assert.equal(response.status,502);assert.ok((await response.json()).error);
});
