import { tags, tagGroups, artists, catalog, recommend, libraryStats, itunesArtistIds } from './catalog.js';
import {newsCalendar,newsVerifiedAt} from './news-data.js';
import { metadata } from './metadata.js';
import { artistIds } from './artist-ids.js';

const cache = new Map(), pending = new Map();
const queues = new Map();
export const normalize = value => value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const json = (data, status = 200) => Response.json(data, {status, headers:{'Cache-Control':'no-store'}});
function scheduled(service, gap, task) {
  const previous = queues.get(service) || Promise.resolve();
  const result = previous.catch(() => {}).then(task);
  queues.set(service, result.catch(() => {}).then(() => new Promise(resolve => setTimeout(resolve, gap))));
  return result;
}
async function cached(key, ttl, task) {
  const old = cache.get(key);
  if (old && Date.now() - old.time < ttl) return {...old.value, cached:true, updatedAt:new Date(old.time).toISOString()};
  if (pending.has(key)) return pending.get(key);
  const job = (async () => {
    try {
      const value = await task();
      cache.set(key, {value, time:Date.now()});
      // Bound memory even when many months are browsed.
      if (cache.size > 100) cache.delete(cache.keys().next().value);
      return {...value, cached:false, updatedAt:new Date().toISOString()};
    } catch (error) {
      if (old) return {...old.value, stale:true, cached:true, updatedAt:new Date(old.time).toISOString(), warning:'API 연결 실패로 이전 조회 결과를 표시합니다.'};
      throw error;
    } finally { pending.delete(key); }
  })();
  pending.set(key, job);
  return job;
}
async function external(url) {
  const response = await fetch(url, {headers:{'User-Agent':'Idollog/1.0 (K-pop release calendar; local educational project)', Accept:'application/json'}, signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw new Error(`External API HTTP ${response.status}`);
  return response.json();
}
async function musicCalendar(month) {
  return cached(`month:${month}`, 30 * 60 * 1000, async () => {
    const last = new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)).getUTCDate();
    const query = `(${Object.values(artistIds).map(id => `arid:${id}`).join(' OR ')}) AND firstreleasedate:[${month}-01 TO ${month}-${last}]`;
    const found = [];
    let total = 0, offset = 0;
    do {
      const url = new URL('https://musicbrainz.org/ws/2/release-group/');
      url.search = new URLSearchParams({query, fmt:'json', limit:'100', offset:String(offset)});
      const data = await scheduled('musicbrainz', 1100, () => external(url));
      if (!Array.isArray(data['release-groups'])) throw new Error('Invalid MusicBrainz response');
      total = data.count || 0;
      for (const item of data['release-groups']) {
        const date = item['first-release-date'];
        const credits = (item['artist-credit'] || []).filter(a => a.artist).map(a => a.artist);
        const artist = Object.keys(artistIds).find(name => credits.some(a => a.id === artistIds[name]));
        if (!artist || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !date.startsWith(month)) continue;
        if (!['Album','EP','Single'].includes(item['primary-type'])) continue;
        if ((item['secondary-types'] || []).some(type => ['Compilation','Live','Remix'].includes(type))) continue;
        found.push({id:item.id, title:item.title, artist, date, type:item['primary-type'], url:`https://musicbrainz.org/release-group/${item.id}`});
      }
      offset += 100;
    } while (offset < total && offset < 1000);
    return {events:found.sort((a,b) => a.date.localeCompare(b.date)), source:'MusicBrainz', partial:total > 1000, trackedArtists:Object.keys(artistIds).length};
  });
}
export async function calendar(month) {
  const news=newsCalendar(month);
  try{
    const live=await musicCalendar(month);
    const clean=value=>value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
    const extra=live.events.filter(item=>!news.some(event=>clean(event.artist)===clean(item.artist)&&(event.date===item.date||clean(event.title).includes(clean(item.title)))));
    return {...live,events:[...news,...extra.map(event=>({...event,origin:'database'}))].sort((a,b)=>a.date.localeCompare(b.date)),newsCount:news.length,newsVerifiedAt,source:'기사·공식 공지 + MusicBrainz'};
  }catch(error){
    if(!news.length)throw error;
    return {events:news,newsCount:news.length,newsVerifiedAt,source:'기사·공식 공지',trackedArtists:Object.keys(artistIds).length,updatedAt:new Date().toISOString(),stale:true,warning:'음악 DB 연결 지연 · 확인된 뉴스 일정은 표시 중'};
  }
}
export async function artistTracks(name) {
  return cached(`artist:${name}`, 24 * 60 * 60 * 1000, async () => {
    const artistId=itunesArtistIds[name];
    const url = new URL(artistId?'https://itunes.apple.com/lookup':'https://itunes.apple.com/search');
    url.search = new URLSearchParams({country:'US',media:'music',entity:'song',limit:'200',...(artistId?{id:artistId}:{term:name,attribute:'artistTerm'})});
    const data = await scheduled('itunes', 3100, () => external(url));
    if (!Array.isArray(data.results)) throw new Error('Invalid iTunes response');
    const tracks = data.results.filter(t => t.kind==='song'&&(artistId?String(t.artistId)===String(artistId):normalize(t.artistName || '')===normalize(name))).map(t => ({
      title:t.trackName, artist:t.artistName, album:t.collectionName, date:t.releaseDate?.slice(0,10),
      artwork:t.artworkUrl100, preview:t.previewUrl, url:t.trackViewUrl, duration:t.trackTimeMillis
    }));
    return {tracks, source:'iTunes Search API'};
  });
}
export async function handleApi(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return json({error:'GET 요청만 지원합니다.'},405);
  try {
    if (url.pathname === '/api/health') return json({ok:true});
    if (url.pathname === '/api/tags') return json({tags,groups:tagGroups,...libraryStats,counts:Object.fromEntries(tags.map(tag=>[tag,recommend([tag]).length]))});
    if (url.pathname === '/api/recommendations') {
      const selected=[...new Set((url.searchParams.get('tags')||'').split(',').filter(Boolean))];
      const year=url.searchParams.get('year')||'all',sort=url.searchParams.get('sort')||'latest';
      const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||20);
      if(selected.some(tag=>!tags.includes(tag))||!['all','recent','2025','2026'].includes(year)||!['latest','title','artist'].includes(sort)||!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>100)return json({error:'태그, 연도, 정렬 또는 페이지 값이 올바르지 않습니다.'},400);
      const matching=recommend(selected,{year,q:(url.searchParams.get('q')||'').slice(0,150)});
      if(sort==='latest')matching.sort((a,b)=>b.date.localeCompare(a.date)||a.artist.localeCompare(b.artist));
      else matching.sort((a,b)=>a[sort].localeCompare(b[sort],'ko')||b.date.localeCompare(a.date));
      return json({songs:matching.slice(offset,offset+limit),total:matching.length,offset,limit,hasMore:offset+limit<matching.length,selected,enough:matching.length>=10,year,tagSource:'직접 분류 및 제목·장르·아티스트 기반 자동 추정',metadataSource:'iTunes Search API',metadataUpdatedAt:libraryStats.updatedAt});
    }
    if(url.pathname==='/api/news'){
      const month=url.searchParams.get('month')||'';
      if(!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(month))return json({error:'month는 YYYY-MM 형식이어야 합니다.'},400);
      return json({events:newsCalendar(month),source:'기사·공식 공지',verifiedAt:newsVerifiedAt});
    }
    if (url.pathname === '/api/calendar') {
      const month = url.searchParams.get('month') || '';
      if (!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(month)) return json({error:'month는 2000~2099년의 YYYY-MM 형식이어야 합니다.'},400);
      return json(await calendar(month));
    }
    if (url.pathname === '/api/artist') {
      const name = url.searchParams.get('name');
      if (!artists.includes(name)) return json({error:'지원하지 않는 아티스트입니다.'},400);
      return json(await artistTracks(name));
    }
    return json({error:'API 경로를 찾을 수 없습니다.'},404);
  } catch {
    return json({error:'외부 음악 API에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.', source:url.pathname === '/api/calendar' ? 'MusicBrainz' : 'iTunes'},502);
  }
}
