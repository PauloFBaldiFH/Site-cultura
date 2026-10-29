// Publica apenas os arquivos do site, sem estado do importador nem código de autenticação.
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT} from './lib/storage.mjs';
const output=path.join(ROOT,'_site');
await fs.rm(output,{recursive:true,force:true});await fs.mkdir(output);
for(const name of ['assets','oficinas','espacos','eventos','vendor','admin'])await fs.cp(path.join(ROOT,name),path.join(output,name),{recursive:true});
for(const entry of await fs.readdir(ROOT,{withFileTypes:true}))if(entry.isFile()&&(/\.(html|css|js|xml|txt)$/.test(entry.name)||entry.name==='CNAME'))await fs.copyFile(path.join(ROOT,entry.name),path.join(output,entry.name));
await fs.writeFile(path.join(output,'.nojekyll'),'');
console.log('Site preparado em _site/');
