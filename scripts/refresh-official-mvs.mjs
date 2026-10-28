// Optional maintainer tool. Requires Python and yt-dlp; the app does not.
// Read public metadata only; never download video/audio, cookies, or credentials.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {mvAuditInfo} from '../backend/mv-data.js';
const run=promisify(execFile),runtime=new URL('../.sites-runtime/',import.meta.url);
await mkdir(runtime,{recursive:true});
const sources=[...new Map(mvAuditInfo.sources.map(source=>[source.id,source])).values()];
let completed=0;
for(const source of sources){
  try{
    const {stdout}=await run(process.env.PYTHON||'python',['-m','yt_dlp','--flat-playlist','--skip-download','--dump-single-json','--playlist-end','6000','--socket-timeout','20','--retries','1','--no-warnings','https://www.youtube.com/channel/'+source.id+'/videos'],{maxBuffer:64*1024*1024,windowsHide:true});
    const data=JSON.parse(stdout);
    if(data.channel_id!==source.id||data.channel_is_verified!==true)throw new Error('Official channel identity could not be confirmed');
    const snapshot={channel:data.channel,channel_id:data.channel_id,channel_url:'https://www.youtube.com/channel/'+source.id,verified:true,checkedAt:new Date().toISOString().slice(0,10),entries:(data.entries||[]).filter(Boolean).map(({id,title,duration})=>({id,title,duration}))};
    await writeFile(new URL('mv-channel-refresh-'+source.id+'.json',runtime),JSON.stringify(snapshot));
    console.log(source.name+': '+snapshot.entries.length+' public video titles');completed++;
  }catch(error){console.error(source.name+': metadata refresh failed ('+error.message.split('\n')[0]+')');}
}
console.log(completed+'/'+sources.length+' channels refreshed. Review snapshots, then run node scripts/import-official-mvs.mjs');
