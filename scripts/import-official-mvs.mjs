// Build a verified MV registry from metadata-only snapshots of official channels.
// The web app itself needs neither Python nor a YouTube API key.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {catalog,artists} from '../backend/catalog.js';
import {parseOfficialMVTitle,artistInMVPrefix,mvMatchesSong} from '../backend/mv-matching.js';
const root=new URL('../',import.meta.url),runtime=new URL('.sites-runtime/',root);
const files=(await readdir(runtime)).filter(name=>/^mv-channel-.*\.json$/.test(name)).sort();
const tracksByArtist=new Map(artists.map(artist=>[artist,catalog.filter(song=>song.artist===artist)]));
const registered=new Map(),sources=[],unmatched=[];
let scanned=0,parsed=0;
for(const file of files){
  const snapshot=JSON.parse(await readFile(new URL(file,runtime),'utf8'));
  if(snapshot.verified!==true||!/^UC[a-zA-Z0-9_-]{22}$/.test(snapshot.channel_id||''))continue;
  sources.push({name:snapshot.channel,id:snapshot.channel_id,url:snapshot.channel_url,checkedAt:snapshot.checkedAt,videos:snapshot.entries.length});
  for(const entry of snapshot.entries){
    scanned++;if(!/^[a-zA-Z0-9_-]{11}$/.test(entry.id||''))continue;
    const info=parseOfficialMVTitle(entry.title||'');if(!info)continue;parsed++;
    let matched=false;
    for(const artist of artists){
      if(!artistInMVPrefix(info.artistText,artist)&&!(info.artistText.trim()===''&&artistInMVPrefix(snapshot.channel,artist)))continue;
      const candidate={artist,title:info.title,version:info.version};
      const songs=tracksByArtist.get(artist).filter(song=>mvMatchesSong(candidate,song));
      if(!songs.length)continue;matched=true;
      registered.set(artist+'|'+entry.id,{...candidate,id:entry.id,channel:snapshot.channel,channelId:snapshot.channel_id,sourceUrl:'https://www.youtube.com/watch?v='+entry.id,sourceTitle:entry.title,verifiedAt:snapshot.checkedAt,priority:info.priority,aliases:[...new Set(songs.map(song=>song.title))]});
    }
    if(!matched)unmatched.push({channel:snapshot.channel,id:entry.id,...info,sourceTitle:entry.title});
  }
}
const records=[...registered.values()].sort((a,b)=>(a.priority-b.priority)||a.artist.localeCompare(b.artist)||a.title.localeCompare(b.title));
const coverage=catalog.filter(song=>records.some(video=>mvMatchesSong(video,song)));
const report={checkedAt:sources.map(source=>source.checkedAt).sort().at(-1),channels:new Set(sources.map(source=>source.id)).size,scanned,parsed,registeredVideos:records.length,matchedSongs:coverage.length,sources};
await writeFile(new URL('backend/mv-data.js',root),'// Generated from verified official channel metadata; no video/audio files stored.\nexport const auditedMVs = '+JSON.stringify(records)+';\nexport const mvAuditInfo = '+JSON.stringify(report)+';\n');
await writeFile(new URL('mv-unmatched.json',runtime),JSON.stringify(unmatched,null,2));
await writeFile(new URL('mv-audit-report.json',runtime),JSON.stringify({...report,coverageByArtist:Object.fromEntries(artists.map(artist=>[artist,coverage.filter(song=>song.artist===artist).length]))},null,2));
console.log(JSON.stringify({channels:report.channels,scanned,parsed,registeredVideos:records.length,matchedSongs:coverage.length}));
