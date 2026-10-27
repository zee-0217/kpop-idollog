// Optional: refresh the bundled, genuinely API-sourced catalog metadata.
import {writeFile} from 'node:fs/promises';
import {catalog} from '../backend/catalog.js';
const artists=[...new Set(catalog.map(song=>song.artist))];
const snapshot={updatedAt:new Date().toISOString(),artists:{}};
for(const artist of artists){
  const url=new URL('https://itunes.apple.com/search');url.search=new URLSearchParams({term:artist,country:'US',media:'music',entity:'song',attribute:'artistTerm',limit:'200'});
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`iTunes ${response.status}`);
  const data=await response.json();
  const normalize=value=>value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  snapshot.artists[artist]=data.results.filter(t=>normalize(t.artistName||'')===normalize(artist)).map(t=>({title:t.trackName,artist:t.artistName,album:t.collectionName,date:t.releaseDate?.slice(0,10),artwork:t.artworkUrl100,preview:t.previewUrl,url:t.trackViewUrl,duration:t.trackTimeMillis}));
  console.log(`${artist}: ${snapshot.artists[artist].length} tracks`);
  await new Promise(resolve=>setTimeout(resolve,3200));
}
await writeFile(new URL('../backend/metadata.js',import.meta.url),`// iTunes API snapshot. Refresh with node scripts/refresh-metadata.mjs.\nexport const metadata = ${JSON.stringify(snapshot)};\n`);
console.log('Metadata snapshot refreshed.');
