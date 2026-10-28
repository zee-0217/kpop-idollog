import {discoveryOrder} from './discovery.js';
import {auditedMVs} from './mv-data.js';
import {heroPhotoPool} from './hero-data.js';
import {mvArtistName,mvVersion,mvTitleKeys,mvSongKeys} from './mv-matching.js';
// Official uploads verified against their original YouTube pages.
// A video ID is embedded only for a known artist/title pair, never guessed.
const manuallyVerifiedMVs=[
  {artist:'Jung Kook',title:'Seven',id:'QU9c0053UAU',channel:'HYBE LABELS'},
  {artist:'Jung Kook',title:'Standing Next to You',id:'UNo0TG9LwwI',channel:'HYBE LABELS'},
  {artist:'NAYEON',title:'POP!',id:'f6YDKF0LVWw',channel:'JYP Entertainment'},
  {artist:'NAYEON',title:'ABCD',id:'oUZttxRcPZw',channel:'JYP Entertainment'},
  {artist:'aespa',title:'Whiplash',id:'jWQx2f-CErU',channel:'SMTOWN'},
  {artist:'aespa',title:'Supernova',id:'phuiiNCxRMg',channel:'SMTOWN'},
  {artist:'BTS',title:'Dynamite',id:'gdZLi9oWNZg',channel:'HYBE LABELS'},
  {artist:'BTS',title:'Butter',id:'WMweEpGlu_U',channel:'HYBE LABELS'},
  {artist:'IVE',title:'LOVE DIVE',id:'Y8JFxS1HlDo',channel:'starshipTV'}
];
const mediaNormalize=value=>value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export const officialMVs=[...manuallyVerifiedMVs,...auditedMVs];
const videoLookup=new Map();
for(const video of officialMVs){
  const artist=mediaNormalize(mvArtistName(video.artist)),version=video.version||mvVersion(video.title);
  for(const title of [video.title,...(video.aliases||[])])for(const key of mvTitleKeys(title)){
    const lookup=artist+'|'+version+'|'+key;if(!videoLookup.has(lookup))videoLookup.set(lookup,video);
  }
}
const matchedVideoCache=new Map();
export function officialVideo(song){
  const cacheKey=song.artist+'|'+song.title;if(matchedVideoCache.has(cacheKey))return matchedVideoCache.get(cacheKey);
  const artist=mediaNormalize(mvArtistName(song.artist)),version=mvVersion(song.title);
  let result=null;
  for(const key of mvSongKeys(song)){const candidate=videoLookup.get(artist+'|'+version+'|'+key);if(candidate){result=candidate;break;}}
  matchedVideoCache.set(cacheKey,result);return result;
}
export function listeningLinks(song){
  const query=`${song.artist} ${song.title}`;
  return {
    youtube:'https://www.youtube.com/results?'+new URLSearchParams({search_query:query+' official MV'}),
    youtubeMusic:'https://music.youtube.com/search?'+new URLSearchParams({q:query}),
    spotify:'https://open.spotify.com/search/'+encodeURIComponent(query)
  };
}
export function heroPhotos(catalog,seed,exclude=[]){
  const artists=new Map();
  for(const photo of heroPhotoPool){if(!artists.has(photo.artist))artists.set(photo.artist,[]);artists.get(photo.artist).push(photo);}
  // Choose artists first so groups with more covers do not dominate the draw.
  const candidates=[...artists].map(([artist,photos])=>discoveryOrder(photos,seed+'|'+artist)[0]);
  const available=candidates.filter(photo=>!exclude.includes(photo.artist));
  return discoveryOrder(available.length>=2?available:candidates,seed).slice(0,2);
}
