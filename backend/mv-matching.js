import {artistAliases,titleAliases,normalizeSearch,resolveArtistQuery} from './search-aliases.js';

export function mvArtistName(value){return resolveArtistQuery(value)||value;}
export function mvVersion(value){
  const text=value.normalize('NFKC').toLowerCase();
  const language=text.match(/\b(japanese|english|chinese|korean|jpn|jp|eng|chn|kor)\s*(?:ver\.?|version)\b/);
  if(language)return ({jpn:'japanese',jp:'japanese',eng:'english',chn:'chinese',kor:'korean'})[language[1]]||language[1];
  const groups=[...text.matchAll(/[([（]([^\])）]+)[\])）]/g)].map(match=>match[1]);
  for(const part of groups){
    if(/^(?:japanese|english|chinese|korean)$/.test(part.trim()))return part.trim();
    if(/\b(?:remix|mix|instrumental|acoustic|alternate|live|sped|slowed)\b/.test(part))return 'variant:'+normalizeSearch(part);
    if(/\b(?:ver\.?|version|edition)\b/.test(part)&&!/\b(?:clean|explicit|original|album|single|remaster)\b/.test(part))return 'variant:'+normalizeSearch(part);
  }
  return '';
}
export function mvTitleKeys(value){
  const cleaned=value.normalize('NFKC').replace(/\s*[([（](?:feat\.?|ft\.?|featuring|clean(?:\s+ver(?:sion)?\.?)?|explicit(?:\s+ver(?:sion)?\.?)?|original\s+ver(?:sion)?\.?|\d{4}\s+remaster(?:ed)?|remaster(?:ed)?(?:\s+\d{4})?)[^\])）]*[\])）]/gi,'').trim();
  const keys=new Set([normalizeSearch(cleaned)]);
  const parentheses=[...cleaned.matchAll(/[([（]([^\])）]+)[\])）]/g)];
  const outside=cleaned.replace(/[([（][^\])）]+[\])）]/g,'').trim();
  if(outside)keys.add(normalizeSearch(outside));
  for(const match of parentheses){if(!/\b(?:ver\.?|version|remix|mix|feat|live|instrumental)\b/i.test(match[1]))keys.add(normalizeSearch(match[1]));}
  keys.delete('');return keys;
}
const extraSongNames=Object.entries(titleAliases).map(([key,aliases])=>{const [artist,title]=key.split('|');return {artist,title,aliases};});
export function mvSongKeys(song){
  const keys=mvTitleKeys(song.title),artist=mvArtistName(song.artist);
  for(const row of extraSongNames){
    if(row.artist!==artist)continue;
    if([...mvTitleKeys(row.title)].some(key=>keys.has(key)))for(const alias of row.aliases)for(const key of mvTitleKeys(alias))keys.add(key);
  }
  return keys;
}
export function mvMatchesSong(video,song){
  if(normalizeSearch(mvArtistName(video.artist))!==normalizeSearch(mvArtistName(song.artist)))return false;
  if((video.version||mvVersion(video.title))!==mvVersion(song.title))return false;
  const songKeys=mvSongKeys(song);
  return [video.title,...(video.aliases||[])].some(title=>[...mvTitleKeys(title)].some(key=>songKeys.has(key)));
}
export function artistInMVPrefix(prefix,artist){
  const normalized=normalizeSearch(prefix),words=prefix.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ');
  return [artist,...(artistAliases[artist]||[])].some(alias=>{
    if(/^[a-z0-9]{1,3}$/i.test(alias))return words.split(/\s+/).includes(alias.toLowerCase());
    return normalized.includes(normalizeSearch(alias));
  });
}
export function parseOfficialMVTitle(rawTitle){
  // Check the whole upload title: unquoted uploads can put these words inside
  // the parsed song portion, and mixed quotation marks occur on older videos.
  if(/\b(?:teaser|trailer|behind|reaction|choreography|performance|lyric|lyrics|making)\b|dance\s*(?:practice|ver)|special\s*clip|stage\s*mix|live\s*(?:clip|ver|video|performance)|안무|티저|비하인드|리액션/i.test(rawTitle))return null;
  const marker=/\bM\s*\/?\s*V\b|\bmusic\s*video\b|\bofficial\s+video\b/ig;
  if(!marker.test(rawTitle))return null;
  const text=rawTitle.normalize('NFKC').replace(marker,' ').trim();
  const delimiters=[['“','”'],['‘','’'],['"','"'],["'","'"],['「','」'],['『','』']];
  let prefix='',title='',suffix='';
  for(const [open,close] of delimiters){
    let first=text.indexOf(open);
    if(open==="'"){while(first>0&&!/[\s[(]/.test(text[first-1]))first=text.indexOf(open,first+1);}
    const last=text.lastIndexOf(close);
    if(first>=0&&last>first){prefix=text.slice(0,first);title=text.slice(first+open.length,last);suffix=text.slice(last+close.length);break;}
  }
  if(!title){
    const cleaned=text.replace(/^\s*\[\s*(?:official\s*)?\]\s*/i,'').trim();
    const split=cleaned.indexOf(' - ');
    if(split<0)return null;prefix=cleaned.slice(0,split);title=cleaned.slice(split+3);suffix='';
  }
  const context=prefix+' '+suffix;
  if(/teaser|trailer|behind|reaction|choreograph|performance|dance\s*(?:practice|ver)|lyric|making|special\s*clip|stage\s*mix|live\s*(?:clip|ver|video|performance)|안무|티저|비하인드|리액션/i.test(context))return null;
  title=title.trim();if(!title)return null;
  return {title,artistText:prefix.trim(),version:mvVersion(title+' ('+suffix.trim()+')'),priority:/\b(?:ver|version)\b/i.test(suffix)?1:0};
}
