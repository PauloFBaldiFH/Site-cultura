import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {ROOT} from '../lib/storage.mjs';
test('importação, revisão explícita, publicação estática, calendário e repetição sem duplicatas',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cultura-pipeline-'));
  try{
    await fs.cp(path.join(ROOT,'automation'),path.join(dir,'automation'),{recursive:true,filter:source=>!source.includes('/automation/state')});
    for(const name of ['index.html','oficinas','eventos','data'])await fs.cp(path.join(ROOT,name),path.join(dir,name),{recursive:true});
    const configPath=path.join(dir,'automation/config.json'),config=JSON.parse(await fs.readFile(configPath,'utf8'));config.downloadImages=false;await fs.writeFile(configPath,JSON.stringify(config));
    const state=path.join(dir,'automation/state');const run=(...args)=>spawnSync(process.execPath,[path.join(dir,'automation/cli.mjs'),...args],{cwd:dir,env:{...process.env,CULTURA_STATE_DIR:state},encoding:'utf8'});
    const input=path.join(dir,'input.json');await fs.writeFile(input,JSON.stringify([{url:'https://www.instagram.com/p/CULTURA_TEST/',text:'FEMUSE com violino na biblioteca. Texto <img src=x onerror=alert(1)> de teste.',publishedAt:'2026-10-26T12:00:00-03:00'}]));
    assert.equal(run('import',input).status,0);assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir,'data/publicacoes.json'),'utf8')),[]);
    let drafts=JSON.parse(await fs.readFile(path.join(state,'drafts.json'),'utf8'));assert.equal(drafts.length,1);assert.equal(drafts[0].status,'pending');assert(drafts[0].suggestions.some(g=>g.id==='evento:femuse'));
    assert.equal(run('approve','ig-CULTURA_TEST').status,1);
    assert.equal(run('approve','ig-CULTURA_TEST','--title','Notícia','--tags','evento:femuse','--event-date','2026-02-30').status,1);
    assert.equal(run('approve','ig-CULTURA_TEST','--title','Notícia','--tags','oficina:inexistente').status,1);
    const approved=run('approve','ig-CULTURA_TEST','--title','Notícia revisada','--tags','oficina:violino,espaco:biblioteca,evento:femuse','--event-date','2026-12-10','--event-time','19h','--venue','Teatro Municipal');assert.equal(approved.status,0,approved.stderr);
    const posts=JSON.parse(await fs.readFile(path.join(dir,'data/publicacoes.json'),'utf8'));assert.equal(posts.length,1);assert.equal(posts[0].eventDate,'2026-12-10');
    const event=await fs.readFile(path.join(dir,'eventos/femuse.html'),'utf8');assert(event.includes('Notícia revisada'));assert(event.includes('&lt;img src=x onerror=alert(1)&gt;'));assert(!event.includes('<img src=x'));
    const violin=await fs.readFile(path.join(dir,'oficinas/violino.html'),'utf8');assert(violin.includes('Notícia revisada'));
    assert((await fs.readFile(path.join(dir,'index.html'),'utf8')).includes('Notícia revisada'));
    assert((await fs.readFile(path.join(dir,'eventos/calendar-data.js'),'utf8')).includes('2026-12-10'));
    assert.equal(run('import',input).status,0);drafts=JSON.parse(await fs.readFile(path.join(state,'drafts.json'),'utf8'));assert.equal(drafts.length,1);assert.equal(drafts[0].status,'approved');
    const first=await fs.readFile(path.join(dir,'index.html'),'utf8');assert.equal(run('build').status,0);assert.equal(await fs.readFile(path.join(dir,'index.html'),'utf8'),first);
    assert.equal((await fs.readFile(path.join(dir,'sitemap.xml'),'utf8')).match(/<loc>/g).length,33);
    await fs.mkdir(path.join(state,'lock'));assert.equal(run('import',input).status,1);assert.equal(JSON.parse(await fs.readFile(path.join(dir,'data/publicacoes.json'),'utf8')).length,1);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
