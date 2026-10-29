import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT} from '../lib/storage.mjs';
import {handle} from '../oauth/worker.mjs';

test('conteúdo do painel altera páginas, preserva galerias e não executa HTML',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cultura-cms-'));
  try{
    for(const name of ['automation','data','oficinas','eventos','espacos','index.html'])await fs.cp(path.join(ROOT,name),path.join(dir,name),{recursive:true,filter:p=>!p.includes('/automation/state')});
    const file=path.join(dir,'data/content.json');const content=JSON.parse(await fs.readFile(file,'utf8'));
    content.home.title='Título editado';
    const event=content.events.find(e=>e.id==='femuse');event.name='FEMUSE revisado';event.body='Primeiro parágrafo.\n\n<script>alert(1)</script>';event.photos=[{image:'/assets/uploads/foto teste.jpg',caption:'Foto <teste>'}];
    content.spaces.find(e=>e.id==='biblioteca').description='Apresentação revisada.';
    content.workshops.find(e=>e.id==='teatro').paragraphs=['Oficina revisada <img src=x>'];
    await fs.writeFile(file,JSON.stringify(content));
    const run=()=>spawnSync(process.execPath,[path.join(dir,'automation/cli.mjs'),'build'],{cwd:dir,env:{...process.env,CULTURA_STATE_DIR:path.join(dir,'automation/state')},encoding:'utf8'});
    let result=run();assert.equal(result.status,0,result.stderr);
    const home=await fs.readFile(path.join(dir,'index.html'),'utf8');assert(home.includes('Título editado'));assert(home.includes('Apresentação revisada.'));assert(home.includes('https://biblioteca.palotina.org/'));
    const html=await fs.readFile(path.join(dir,'eventos/femuse.html'),'utf8');assert(html.includes('FEMUSE revisado'));assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert(!html.includes('<script>alert(1)</script>'));assert(html.includes('assets/uploads/foto%20teste.jpg'));assert(html.includes('Parte 3'));
    const workshop=await fs.readFile(path.join(dir,'oficinas/teatro.html'),'utf8');assert(workshop.includes('Oficina revisada &lt;img src=x&gt;'));
    assert.equal((await fs.readFile(path.join(dir,'data/content.json'),'utf8')),JSON.stringify(content));
    result=run();assert.equal(result.status,0,result.stderr);assert.equal(await fs.readFile(path.join(dir,'index.html'),'utf8'),home);
    event.photos[0].image='/assets/../segredo.jpg';await fs.writeFile(file,JSON.stringify(content));assert.equal(run().status,1);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('OAuth exige estado, conta com escrita e origem exata do painel',async()=>{
  const env={GITHUB_CLIENT_ID:'id-de-teste',GITHUB_CLIENT_SECRET:'segredo-de-teste'};
  const denied=()=>{throw Error('Rede não deveria ser acessada');};
  assert.equal((await handle(new Request('https://auth.example/auth?provider=github'),{},denied)).status,503);
  assert.equal((await handle(new Request('https://auth.example/auth?provider=outro'),env,denied)).status,400);
  const auth=await handle(new Request('https://auth.example/auth?provider=github'),env,denied);assert.equal(auth.status,302);
  const target=new URL(auth.headers.get('location'));assert.equal(target.origin,'https://github.com');assert.equal(target.searchParams.get('scope'),'public_repo');assert.equal(target.searchParams.get('redirect_uri'),'https://auth.example/callback');
  const state=target.searchParams.get('state');const cookies=auth.headers.get('set-cookie');assert(cookies.includes('HttpOnly'));assert(cookies.includes('Secure'));assert(cookies.includes('SameSite=Lax'));
  assert.equal((await handle(new Request('https://auth.example/callback?code=abc&state='+state),env,denied)).status,400);
  const request=new Request('https://auth.example/callback?code=abc&state='+state,{headers:{Cookie:cookies.split(';')[0]}});
  const fake=async url=>new Response(JSON.stringify(url.includes('access_token')?{access_token:'gho_FAKE_TOKEN_FOR_TESTS_ONLY_1234'}:{permissions:{push:true}}),{headers:{'Content-Type':'application/json'}});
  const response=await handle(request,env,fake);assert.equal(response.status,200);assert(response.headers.get('Cache-Control').includes('no-store'));const html=await response.text();assert(html.includes('https://cultura.palotina.org'));assert(html.includes('event.origin!==origin'));assert(html.includes('event.source!==window.opener'));assert(!html.includes('segredo-de-teste'));assert(!html.includes('postMessage(\'*\''));
  const readOnly=async url=>new Response(JSON.stringify(url.includes('access_token')?{access_token:'gho_FAKE_TOKEN_FOR_TESTS_ONLY_1234'}:{permissions:{push:false}}));
  assert.equal((await handle(request,env,readOnly)).status,403);
});

test('configuração do Decap aponta para conteúdo real e mantém rascunhos',async()=>{
  const config=JSON.parse(await fs.readFile(path.join(ROOT,'admin/config.yml'),'utf8'));
  assert.equal(config.backend.repo,'PauloFBaldiFH/Site-cultura');assert.equal(config.publish_mode,'editorial_workflow');
  const file=config.collections[0].files[0];const data=JSON.parse(await fs.readFile(path.join(ROOT,file.file),'utf8'));
  for(const field of file.fields)assert(Object.hasOwn(data,field.name));
  assert.equal(data.workshops.length,28);assert.equal(data.spaces.length,5);
});
