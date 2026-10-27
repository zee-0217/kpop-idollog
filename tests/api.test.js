import test from 'node:test';
import assert from 'node:assert/strict';
import {handleApi} from '../backend/api.js';
import {tags,tagGroups,catalog,recommend,libraryStats} from '../backend/catalog.js';
import {artistIds} from '../backend/artist-ids.js';
import {newsEvents,newsCalendar} from '../backend/news-data.js';
import {libraryData} from '../backend/library-data.js';
const request=(path,method='GET')=>handleApi(new Request('https://example.test'+path,{method}));
const data=async path=>(await request(path)).json();
const norm=value=>value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');

test('catalog contains 1000+ genuine songs, recent releases, and unique identities',()=>{
  assert.ok(catalog.length>=1000);assert.ok(libraryStats.year2025>=100);assert.ok(libraryStats.year2026>=100);
  assert.equal(new Set(catalog.map(song=>norm(song.artist)+'|'+norm(song.title))).size,catalog.length);
  for(const song of catalog){assert.ok(song.url?.startsWith('https://'));assert.match(song.date,/^\d{4}-\d{2}-\d{2}$/);assert.ok(song.date<='2026-10-27');assert.ok(song.tags.every(tag=>tags.includes(tag)));assert.ok(['curated','mixed','suggested'].includes(song.tagMethod));}
});
test('all requested subcategories are exposed and every single tag has 10+ songs',()=>{
  assert.deepEqual(tagGroups.map(group=>group.label),['분위기','장르','상황']);
  assert.deepEqual(tagGroups.map(group=>group.tags.length),[8,8,9]);assert.equal(tags.length,25);
  for(const tag of tags)assert.ok(recommend([tag]).length>=10,tag);
});
test('same-name artists are filtered using pinned iTunes identities',()=>{
  for(const song of libraryData.tracks)assert.equal(String(song.artistId),String(libraryData.artistIds[song.artist]));
  assert.ok(libraryData.tracks.filter(song=>song.artist==='LISA').every(song=>song.artistId===1583908668));
  assert.ok(libraryData.tracks.filter(song=>song.artist==='ILLIT').every(song=>song.artistId===1734551937));
});
test('all 576 mood/genre/situation triples use exact AND intersections',()=>{
  for(const mood of tagGroups[0].tags)for(const genre of tagGroups[1].tags)for(const situation of tagGroups[2].tags){
    const selected=[mood,genre,situation];
    assert.deepEqual(recommend(selected),catalog.filter(song=>selected.every(tag=>song.tags.includes(tag))));
  }
  assert.deepEqual(recommend(tags),[]);
});
test('API handles grouped tags, duplicate tags, year filters, queries, sorting and pagination',async()=>{
  const groups=await data('/api/tags');assert.equal(groups.total,catalog.length);assert.equal(groups.groups.length,3);
  const params=new URLSearchParams({tags:'몽환,팝,몽환',year:'2026',limit:'10',sort:'latest'});
  const first=await data('/api/recommendations?'+params);assert.deepEqual(first.selected,['몽환','팝']);
  assert.ok(first.songs.every(song=>song.tags.includes('몽환')&&song.tags.includes('팝')&&song.date.startsWith('2026')));
  assert.ok(first.songs.every((song,i)=>i===0||song.date<=first.songs[i-1].date));
  params.set('offset','10');const second=await data('/api/recommendations?'+params);assert.equal(first.total,second.total);
  assert.ok(second.songs.every(song=>!first.songs.some(old=>old.id===song.id)));
  const query=await data('/api/recommendations?q=Insomnia&year=2026');assert.ok(query.songs.some(song=>song.artist==='RIIZE'));
  const empty=await data('/api/recommendations?tags='+encodeURIComponent(tags.join(',')));assert.equal(empty.total,0);assert.equal(empty.enough,false);
  const sorted=await data('/api/recommendations?sort=title&limit=100');assert.ok(sorted.songs.every((song,i)=>i===0||sorted.songs[i-1].title.localeCompare(song.title,'ko')<=0));
});
test('invalid inputs are rejected',async()=>{
  for(const path of ['/api/calendar?month=2026-13','/api/calendar?month=26-10','/api/news?month=2026-02-01','/api/recommendations?tags=unknown','/api/recommendations?year=2027','/api/recommendations?offset=-1','/api/recommendations?limit=10000','/api/recommendations?sort=bad','/api/artist?name=unknown'])assert.equal((await request(path)).status,400,path);
  assert.equal((await request('/api/nope')).status,404);assert.equal((await request('/api/health','POST')).status,405);
});
test('news facts include dated 2026 sources and are available without external fetches',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('network unavailable');});
  const news=await data('/api/news?month=2026-10');assert.ok(news.events.length>=15);
  for(const event of newsEvents){assert.equal(event.verifiedAt,'2026-10-27');assert.ok(event.date.startsWith('2026'));assert.ok(event.sources.length);assert.ok(event.sources.every(source=>source.url.startsWith('https://')));}
  assert.ok(newsCalendar('2026-11').some(event=>event.artist==='TOMORROW X TOGETHER'&&event.date==='2026-11-16'));
});
test('calendar filters invalid identities and handles leap-year bounds and caching',async t=>{
  let calls=0;const credit=[{artist:{name:'aespa',id:artistIds.aespa}}];
  t.mock.method(globalThis,'fetch',async url=>{calls++;assert.ok(new URL(url).searchParams.get('query').includes('2024-02-29'));return Response.json({count:4,'release-groups':[
    {id:'valid',title:'New EP','first-release-date':'2024-02-12','primary-type':'EP','artist-credit':credit},
    {id:'partial',title:'No day','first-release-date':'2024-02','primary-type':'Single','artist-credit':credit},
    {id:'wrong',title:'Same name','first-release-date':'2024-02-12','primary-type':'Album','artist-credit':[{artist:{name:'aespa',id:'wrong-id'}}]},
    {id:'live',title:'Live','first-release-date':'2024-02-12','primary-type':'Album','secondary-types':['Live'],'artist-credit':credit}
  ]});});
  const first=await data('/api/calendar?month=2024-02');assert.equal(first.events.length,1);assert.equal(first.events[0].id,'valid');
  const again=await data('/api/calendar?month=2024-02');assert.equal(calls,1);assert.equal(again.cached,true);
});
test('news KST dates override a conflicting DB date and duplicate entry',async t=>{
  t.mock.method(globalThis,'fetch',async()=>Response.json({count:1,'release-groups':[{id:'timezone-date',title:'Insomnia','first-release-date':'2026-10-25','primary-type':'Single','artist-credit':[{artist:{name:'RIIZE',id:artistIds.RIIZE}}]}]}));
  const month=await data('/api/calendar?month=2026-10');const riize=month.events.filter(event=>event.artist==='RIIZE');assert.equal(riize.length,1);assert.equal(riize[0].date,'2026-10-26');assert.equal(riize[0].origin,'news');
});
test('news still displays when MusicBrainz is unavailable',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('offline');});
  const response=await request('/api/calendar?month=2026-11');assert.equal(response.status,200);const month=await response.json();assert.ok(month.events.length>=5);assert.equal(month.stale,true);assert.ok(month.warning);
  assert.equal((await request('/api/calendar?month=2023-01')).status,502);
});
