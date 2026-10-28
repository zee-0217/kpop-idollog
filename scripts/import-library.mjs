// Real iTunes metadata only. Requests are serialized and resumable.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {metadata} from '../backend/metadata.js';
import {newsEvents} from '../backend/news-data.js';
const asOf=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
const normalize=v=>v.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const additional=[...Object.keys(metadata.artists),'Stray Kids','ENHYPEN','ATEEZ','ITZY','NMIXX','ILLIT','RIIZE','BOYNEXTDOOR','NCT 127','NCT DREAM','NCT WISH','ZEROBASEONE','BABYMONSTER','KISS OF LIFE','STAYC','fromis_9','Kep1er','tripleS','P1Harmony','TREASURE','THE BOYZ','MONSTA X','IU','TAEYEON','TAEMIN','JENNIE','JISOO','LISA','ROSÉ','i-dle','DAY6','Xdinary Heroes','N.Flying','CNBLUE','FTISLAND','BOL4','AKMU','Heize','BIBI','WENDY','TWS','Hearts2Hearts','KATSEYE','PLAVE','KickFlip','Jung Kook','NAYEON','Jimin','j-hope','Jin','RM','Agust D','V','JIHYO','TZUYU','CHAEYOUNG','KEY','ONEW','MINHO','SEULGI','IRENE','JOY','BAEKHYUN','D.O.','KAI','SUHO','CHEN','XIUMIN','YUQI','MINNIE','MIYEON','JEON SOMI','CHUNG HA','SUNMI','KANGDANIEL',...newsEvents.map(event=>event.artist)];
const fresh=['Jung Kook','NAYEON','AND2BLE','A2O SOUL','A2O LITE','IVE','ILLIT','NMIXX','RIIZE','TWICE','BTS','TOMORROW X TOGETHER','LE SSERAFIM','aespa','SEVENTEEN','Stray Kids','ENHYPEN'];
await mkdir(new URL('../.sites-runtime/',import.meta.url),{recursive:true});
const checkpoint=new URL('../.sites-runtime/library-import.json',import.meta.url);
let state;try{state=JSON.parse(await readFile(checkpoint,'utf8'));}catch{state={tracks:Object.values(metadata.artists).flat(),done:[]};}
const convert=t=>({trackId:t.trackId,artistId:t.artistId,title:t.trackName,artist:t.artistName,album:t.collectionName,date:t.releaseDate?.slice(0,10),artwork:t.artworkUrl100,preview:t.previewUrl,url:t.trackViewUrl,duration:t.trackTimeMillis,apiGenre:t.primaryGenreName||'K-Pop'});
const save=()=>writeFile(checkpoint,JSON.stringify(state));
const acceptedArtist=(source,name)=>normalize(source||'')===normalize(name)||(source||'').split(/&|,/).some(part=>normalize(part)===normalize(name));
async function fetchData(params){
  await new Promise(r=>setTimeout(r,3200));
  const url=new URL(params.id?'https://itunes.apple.com/lookup':'https://itunes.apple.com/search');url.search=new URLSearchParams({country:'US',media:'music',limit:'200',...params});
  for(let attempt=0;attempt<3;attempt++){
    try{const r=await fetch(url,{signal:AbortSignal.timeout(18000)});if(!r.ok)throw new Error(String(r.status));const data=await r.json();if(!Array.isArray(data.results))throw new Error('Invalid API response');return data.results;}
    catch(error){if(attempt===2)throw error;await new Promise(r=>setTimeout(r,6000));}
  }
}
for(const artist of additional){
  const key=`songs:${artist}`;if(state.done.includes(key))continue;
  try{const tracks=(await fetchData({term:artist,entity:'song',attribute:'artistTerm'})).filter(t=>acceptedArtist(t.artistName,artist)&&t.kind==='song');state.tracks.push(...tracks.map(track=>({...convert(track),artist,creditArtist:track.artistName})));state.done.push(key);await save();console.log(`${artist}: ${tracks.length} songs, 2025–26: ${tracks.filter(t=>t.releaseDate>='2025').length}`);}
  catch(error){console.log(`FAILED ${artist}: ${error.message}`);}
}
for(const artist of fresh){
  const key=`albums:${artist}`;if(state.done.includes(key))continue;
  try{
    const albums=(await fetchData({term:artist,entity:'album',attribute:'artistTerm'})).filter(t=>acceptedArtist(t.artistName,artist)&&t.releaseDate>='2025-01-01'&&t.releaseDate<=asOf+'T23:59:59Z'&&!/remix|instrumental|live|karaoke|sped.up|slowed/i.test(t.collectionName)).sort((a,b)=>b.releaseDate.localeCompare(a.releaseDate));
    const ids=[...new Set(albums.map(a=>a.collectionId))].slice(0,4);
    if(ids.length){const tracks=(await fetchData({id:ids.join(','),entity:'song'})).filter(t=>t.kind==='song'&&acceptedArtist(t.artistName,artist));state.tracks.push(...tracks.map(track=>({...convert(track),artist,creditArtist:track.artistName})));console.log(`LATEST ${artist}: ${tracks.length} tracks from ${albums.slice(0,4).map(a=>a.collectionName).join(' / ')}`);}
    state.done.push(key);await save();
  }catch(error){console.log(`FAILED latest ${artist}: ${error.message}`);}
}
// Album identity checked against https://music.apple.com/us/album/dreamscape/6818441016
for(const [artist,albumId] of [['JEONGHAN X JOSHUA','6818441016']]){
  const key='verified-album:'+albumId;if(state.done.includes(key))continue;
  const rows=(await fetchData({id:albumId,entity:'song'})).filter(track=>track.kind==='song'&&String(track.collectionId)===albumId);
  state.tracks.push(...rows.map(track=>({...convert(track),artist,creditArtist:track.artistName})));state.done.push(key);await save();console.log(artist+': '+rows.length+' verified album tracks');
}
const canonical=t=>normalize(t.replace(/\s*\([^)]*(?:version|ver\.|remaster)[^)]*\)/gi,''));
const unique=new Map();
const votes=new Map();
for(const track of state.tracks){if(!track.artistId)continue;const artist=normalize(track.artist),byId=votes.get(artist)||new Map();const current=byId.get(String(track.artistId))||{count:0,kpop:0};current.count++;if(track.apiGenre==='K-Pop')current.kpop++;byId.set(String(track.artistId),current);votes.set(artist,byId);}
const pinned={LISA:'1583908668',KATSEYE:'1754284416',STAYC:'1538881438',JISOO:'1548008317',ILLIT:'1734551937',BABYMONSTER:'1715981813',BOYNEXTDOOR:'1687612559','KISS OF LIFE':'1694672936',TWS:'1721226191',ITZY:'1451964345','THE BOYZ':'1322012460'};
const identities={};
for(const [artist,byId] of votes){const chosen=[...byId].sort((a,b)=>(b[1].kpop*1000+b[1].count)-(a[1].kpop*1000+a[1].count))[0][0];identities[artist]=chosen;}
for(const [artist,id] of Object.entries(pinned))identities[normalize(artist)]=id;

const displayNames=new Map([...Object.keys(metadata.artists),...additional].map(name=>[normalize(name),name]));
for(const raw of state.tracks){
  const t={...raw,artist:displayNames.get(normalize(raw.artist))||raw.artist};
  if(!t.artistId||String(t.artistId)!==identities[normalize(t.artist)])continue;
  if(!t.title||!t.artist||!t.date||t.date>asOf||(t.duration&&t.duration<60000)||/instrumental|\(inst\.?\)|voice memo|karaoke|a cappella|acappella|remix|sped.up|slowed|live (?:at|in|from)|\(live|japanese (?:ver|version)|english (?:ver|version)|chinese (?:ver|version)|オルゴール/i.test(`${t.title} ${t.album}`))continue;
  const key=normalize(t.artist)+'|'+canonical(t.title),old=unique.get(key);
  if(!old||t.date<old.date)unique.set(key,{...t,apiGenre:t.apiGenre||'K-Pop'});
}
const tracks=[...unique.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.artist.localeCompare(b.artist));
await writeFile(new URL('../backend/library-data.js',import.meta.url),`// Genuine iTunes API metadata; generated by scripts/import-library.mjs.\nexport const libraryData = ${JSON.stringify({updatedAt:new Date().toISOString(),source:'iTunes Search API',artistIds:Object.fromEntries([...Object.keys(metadata.artists),...additional].map(name=>[name,identities[normalize(name)]])),tracks})};\n`);
console.log(JSON.stringify({total:tracks.length,recent:tracks.filter(t=>t.date>='2025-01-01').length,year2026:tracks.filter(t=>t.date.startsWith('2026')).length,artists:new Set(tracks.map(t=>t.artist)).size}));
