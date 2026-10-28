import {mkdir,copyFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('public/',root),{recursive:true});
// Publish only browser assets. Catalogs and API source remain server-side.
for(const file of ['index.html','styles.css','brand.css','app.js']){
  await copyFile(new URL('frontend/'+file,root),new URL('public/'+file,root));
}
console.log('Built public/ (HTML, CSS, JavaScript); API entry: api/index.js');
