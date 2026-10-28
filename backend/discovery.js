export const koreaCurrentYear=()=>new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date());
function seededRandom(seed){
  let state=2166136261;
  for(const char of String(seed))state=Math.imul(state^char.charCodeAt(0),16777619)>>>0;
  return ()=>{state+=0x6D2B79F5;let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return ((value^(value>>>14))>>>0)/4294967296;};
}
function shuffle(items,random){
  const result=[...items];
  for(let index=result.length-1;index>0;index--){const other=Math.floor(random()*(index+1));[result[index],result[other]]=[result[other],result[index]];}
  return result;
}
export function coverKey(song){
  try{return new URL(song.artwork).pathname.replace(/\/\d+x\d+[^/]*$/,'').toLowerCase();}
  catch{return `${song.artist}|${song.album||song.title}`.toLowerCase();}
}
// Take one song per cover before revisiting a cover. Ordering is stable for
// the same seed so pagination never reshuffles already viewed results.
export function discoveryOrder(songs,seed){
  const random=seededRandom(seed),byCover=new Map();
  for(const song of songs){const key=coverKey(song);if(!byCover.has(key))byCover.set(key,[]);byCover.get(key).push(song);}
  let groups=shuffle([...byCover].map(([key,tracks])=>({key,tracks:shuffle(tracks,random),offset:0})),random);
  const ordered=[];let previous=null;
  while(groups.length){
    if(groups.length>1&&groups[0].key===previous)[groups[0],groups[1]]=[groups[1],groups[0]];
    for(const group of groups){ordered.push(group.tracks[group.offset++]);previous=group.key;}
    groups=shuffle(groups.filter(group=>group.offset<group.tracks.length),random);
  }
  return ordered;
}
