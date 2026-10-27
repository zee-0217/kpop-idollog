import {writeFile} from 'node:fs/promises';
import {artists} from '../backend/catalog.js';
const normalize=value=>value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const resolved={};
for(let i=0;i<artists.length;i+=6){
  const names=artists.slice(i,i+6),url=new URL('https://musicbrainz.org/ws/2/artist/');
  const query=`(${names.map(name=>`artist:"${name}"`).join(' OR ')}) AND (country:KR OR country:NZ OR country:TH)`;
  url.search=new URLSearchParams({query,fmt:'json',limit:'100'});
  let response;
  for(let attempt=0;attempt<4;attempt++){
    response=await fetch(url,{headers:{'User-Agent':'ComebackClub/1.0 (educational K-pop calendar)'},signal:AbortSignal.timeout(20000)});
    if(response.ok)break;
    await new Promise(resolve=>setTimeout(resolve,3500));
  }
  if(!response.ok)throw new Error(`MusicBrainz ${response.status}`);
  const data=await response.json();
  for(const name of names){let candidates=data.artists.filter(a=>normalize(a.name)===normalize(name));
    if(candidates.length>1&&['JISOO','LISA','ROSÉ'].includes(name))candidates=candidates.filter(a=>a.disambiguation==='BLACKPINK');
    if(candidates.length===1){resolved[name]=candidates[0].id;console.log(name,candidates[0].id);}
    else console.log('REVIEW',name,JSON.stringify(candidates.map(a=>({id:a.id,name:a.name,country:a.country,type:a.type,disambiguation:a.disambiguation}))));
  }
  await new Promise(resolve=>setTimeout(resolve,2200));
}
await writeFile(new URL('../backend/artist-ids.js',import.meta.url),`// Verified MusicBrainz artist identities; ambiguous names are omitted.\nexport const artistIds = ${JSON.stringify(resolved,null,2)};\n`);
