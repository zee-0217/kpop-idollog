import {libraryData} from './library-data.js';
import {editorialCatalog} from './editorial.js';
import {metadata} from './metadata.js';
import {tagGroups,tags,classify} from './taxonomy.js';
import {normalizeSearch,searchTextFor,resolveArtistQuery} from './search-aliases.js';
export {tagGroups,tags};
const canonical=value=>value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const editorialByArtist=new Map();
for(const item of editorialCatalog){const key=canonical(item.artist),list=editorialByArtist.get(key)||[];list.push({...item,key:canonical(item.title)});editorialByArtist.set(key,list);}
function editorialFor(song){const title=canonical(song.title);return (editorialByArtist.get(canonical(song.artist))||[]).find(old=>old.key===title||title.endsWith(old.key));}
const tracks=libraryData.tracks.map(song=>({...song,...classify(song,editorialFor(song))}));
const titlesByArtist=new Map();
for(const song of tracks){const key=canonical(song.artist),list=titlesByArtist.get(key)||[];list.push(canonical(song.title));titlesByArtist.set(key,list);}
for(const old of editorialCatalog){
  const title=canonical(old.title);
  if((titlesByArtist.get(canonical(old.artist))||[]).some(value=>value===title||value.endsWith(title)))continue;
  const info=(metadata.artists[old.artist]||[]).find(song=>canonical(song.title).endsWith(title));
  if(info)tracks.push({...info,...classify(info,old)});
}
export const catalog=tracks.sort((a,b)=>b.date.localeCompare(a.date)||a.artist.localeCompare(b.artist)).map((song,index)=>({...song,id:`song-${index}`}));
export const artists=[...new Set(catalog.map(song=>song.artist))];
export const itunesArtistIds=libraryData.artistIds;
const searchIndex=new Map(catalog.map(song=>[song.id,searchTextFor(song)]));
export const libraryStats={total:catalog.length,artists:artists.length,recent:catalog.filter(song=>song.date>='2025-01-01').length,year2025:catalog.filter(song=>song.date.startsWith('2025')).length,year2026:catalog.filter(song=>song.date.startsWith('2026')).length,updatedAt:libraryData.updatedAt};
export function recommend(selected,{year='all',q=''}={}){
  const terms=q.trim().split(/\s+/).map(normalizeSearch).filter(Boolean);
  const exactArtist=resolveArtistQuery(q);
  return catalog.filter(song=>selected.every(tag=>song.tags.includes(tag))&&(year==='all'||(year==='recent'?song.date>='2025-01-01':song.date.startsWith(year)))&&(exactArtist?song.artist===exactArtist:terms.every(term=>searchIndex.get(song.id).includes(term))));
}
