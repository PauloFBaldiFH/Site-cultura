import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {classify,canonicalPost,parseProfile,parsePost,fetchBounded,imageExtension,record} from '../lib/core.mjs';
const config=JSON.parse(await fs.readFile(new URL('../config.json',import.meta.url),'utf8'));
test('classificação sem acentos associa assuntos sem confundir viola/violão ou palavras parciais',()=>{
  const tags=classify('Oficina de VIOLINO na biblioteca Castro Alves durante o #FEMUSE',config).map(g=>g.id);
  assert(tags.includes('oficina:violino'));assert(tags.includes('espaco:biblioteca'));assert(tags.includes('evento:femuse'));
  assert(!classify('violão e microbiologia',config).some(g=>g.id==='oficina:viola-caipira'));
  assert(classify('#CantaPalotina e domingueiras',config).some(g=>g.id==='evento:canta-palotina'));
});
test('links externos e caminhos de login são rejeitados',()=>{
  assert.equal(canonicalPost('https://www.instagram.com/p/ABC_xyz/?igsh=tracking'),'https://www.instagram.com/p/ABC_xyz/');
  for(const url of ['http://instagram.com/p/ABC/','https://instagram.com.evil.test/p/ABC/','https://www.instagram.com/accounts/login/'])assert.equal(canonicalPost(url),null);
});
test('extrai somente legenda disponível de JSON público e metadados de post',()=>{
  const body='<script type="application/json">'+JSON.stringify({timeline:{edges:[{node:{shortcode:'ABC_xyz',owner:{username:'cultura_palotina'},edge_media_to_caption:{edges:[{node:{text:'Aulas de violino na Cultura'}}]}}},{node:{shortcode:'WRONG',owner:{username:'outra_conta'},caption:{text:'Não é da Cultura'}}}]}})+'</script>';
  const parsed=parseProfile(body,'cultura_palotina');assert.equal(parsed.posts.length,1);assert.equal(parsed.posts[0].text,'Aulas de violino na Cultura');
  const result=parsePost('<script type="application/ld+json">{"@type":"SocialMediaPosting","articleBody":"FEMUSE: publicação com legenda pública.","datePublished":"2026-10-26T15:00:00Z"}</script>','https://www.instagram.com/p/ABC_xyz/','cultura_palotina');assert.equal(result.text,'FEMUSE: publicação com legenda pública.');
  const meta=parsePost('<meta property="og:url" content="https://www.instagram.com/p/ABC_xyz/"><meta property="og:description" content="Informações sobre a biblioteca &amp; Cultura de Palotina">','https://www.instagram.com/p/ABC_xyz/','cultura_palotina');assert(meta.text.includes('& Cultura'));
  assert.throws(()=>parsePost('<html><form action="/accounts/login/">Login</form></html>','https://www.instagram.com/p/ABC_xyz/','cultura_palotina'),/não disponibilizou/);
});
test('rede rejeita desvio para host privado, login, bloqueio e resposta excessiva',async()=>{
  await assert.rejects(fetchBounded('https://127.0.0.1/private'),/lista permitida/);
  await assert.rejects(fetchBounded('https://www.instagram.com/cultura_palotina/',{fetchImpl:async()=>new Response(null,{status:302,headers:{location:'http://169.254.169.254/metadata'}})}),/lista permitida/);
  await assert.rejects(fetchBounded('https://www.instagram.com/cultura_palotina/',{fetchImpl:async()=>new Response(null,{status:302,headers:{location:'/accounts/login/'}})}),/exige login/);
  await assert.rejects(fetchBounded('https://www.instagram.com/cultura_palotina/',{fetchImpl:async()=>new Response('',{status:429})}),/429/);
  await assert.rejects(fetchBounded('https://www.instagram.com/cultura_palotina/',{limit:5,fetchImpl:async()=>new Response('1234567890')}),/limite/);
});
test('miniatura só aceita formatos passivos e rascunho exige legenda',()=>{
  assert.equal(imageExtension(Buffer.from([255,216,255,0])),'jpg');assert.throws(()=>imageExtension(Buffer.from('<svg onload="alert(1)">')),/não é/);
  assert.throws(()=>record({url:'https://www.instagram.com/p/ABC_xyz/',text:''},config),/Legenda/);
});
