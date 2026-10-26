#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {canonicalPost,record,parseProfile,parsePost,fetchBounded,imageExtension} from './lib/core.mjs';
import {ROOT,STATE,readJSON,writeJSON,locked} from './lib/storage.mjs';
import {build} from './lib/build.mjs';
import {GitHub,githubCredential,automaticPublish} from './lib/automatic.mjs';
const config=await readJSON(path.join(ROOT,'automation/config.json'));
const [command,...args]=process.argv.slice(2);
const draftsFile=path.join(STATE,'drafts.json');
const publicFile=path.join(ROOT,'data/publicacoes.json');
const validTags=new Set(['noticia:geral',...config.groups.map(g=>g.id),...config.events.map(e=>'evento:'+e.id)]);
async function stage(inputs){
  const drafts=await readJSON(draftsFile,[]);const published=await readJSON(publicFile,[]);let added=0;
  for(const input of inputs){
    const item=record(input,config),old=drafts.find(d=>d.id===item.id),approved=published.find(d=>d.id===item.id);
    if(old?.hash===item.hash||approved?.hash===item.hash)continue;
    const draft={...item,status:'pending',collectedAt:new Date().toISOString()};
    if(config.downloadImages&&item.imageUrl){try{const bytes=await fetchBounded(item.imageUrl,{media:true,limit:1536*1024});const ext=imageExtension(bytes);await fs.mkdir(path.join(STATE,'media'),{recursive:true});draft.media=`media/${item.id}.${ext}`;await fs.writeFile(path.join(STATE,draft.media),bytes,{mode:0o600});}catch(error){draft.imageWarning=error.message;}}
    if(old)drafts.splice(drafts.indexOf(old),1);drafts.push(draft);added++;
  }await writeJSON(draftsFile,drafts);return added;
}
async function collect({automatic=false}={}){
  if(!/^[a-zA-Z0-9_.]{1,30}$/.test(config.account))throw Error('Conta inválida');
  const cap=Math.min(6,Math.max(1,Number(config.maxPosts)||6));
  const html=(await fetchBounded(`https://www.instagram.com/${config.account}/`)).toString('utf8');
  const profile=parseProfile(html,config.account);if(!profile.posts.length&&!profile.links.length)throw Error('Instagram não disponibilizou posts públicos neste acesso. Pode exigir login ou bloquear a coleta. Nenhum conteúdo público foi alterado.');
  const inputs=profile.posts.slice(0,cap);const known=new Set(inputs.map(p=>p.url));let requests=0;
  for(const url of profile.links){if(inputs.length>=cap||requests>=cap)break;if(known.has(url))continue;requests++;await delay(Math.max(3000,config.delayMs||3000));
    try{inputs.push(parsePost((await fetchBounded(url)).toString('utf8'),url,config.account));}catch(error){console.error(`Não foi possível importar ${url}: ${error.message}`);}
  }
  if(!inputs.length)throw Error('Nenhuma legenda pública foi extraída. Conteúdo existente preservado.');
  const count=await stage(inputs);
  console.log(automatic?`${count} item(ns) novo(s) coletado(s); verificando publicação automática.`:`${count} rascunho(s) novo(s). Nenhuma publicação automática.`);
}
async function approve(){
  const id=args[0];const value=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
  const drafts=await readJSON(draftsFile,[]),draft=drafts.find(d=>d.id===id);if(!draft||draft.status!=='pending')throw Error('Rascunho pendente não encontrado');
  const title=value('--title');if(!title||title.length<3||title.length>150)throw Error('Informe --title com título revisado (3–150 caracteres)');
  const tags=(value('--tags')||'').split(',').map(x=>x.trim()).filter(Boolean);if(!tags.length||tags.some(tag=>!validTags.has(tag)))throw Error('Informe --tags com categorias válidas; consulte automation/config.json ou o comando list');
  let text=draft.text;if(value('--text-file'))text=await fs.readFile(path.resolve(value('--text-file')),'utf8');if(text.trim().length<10||text.length>20000)throw Error('Texto revisado inválido');
  const eventDate=value('--event-date');
  if(eventDate && (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)||!Number.isFinite(Date.parse(eventDate))||new Date(eventDate).toISOString().slice(0,10)!==eventDate||!tags.some(t=>t.startsWith('evento:'))))throw Error('Data do evento inválida ou sem categoria evento');
  const published=await readJSON(publicFile,[]);const item={id:draft.id,url:draft.url,title,text:text.trim(),publishedAt:draft.publishedAt,hash:draft.hash,tags:[...new Set(tags)]};
  if(eventDate){item.eventDate=eventDate;item.eventTime=value('--event-time')||'';item.eventLocation=value('--venue')||'';}
  if(draft.media){if(!/^media\/ig-[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(draft.media))throw Error('Caminho de mídia inválido');const bytes=await fs.readFile(path.join(STATE,draft.media));imageExtension(bytes);await fs.mkdir(path.join(ROOT,'assets/publicacoes'),{recursive:true});item.image='assets/publicacoes/'+path.basename(draft.media);await fs.writeFile(path.join(ROOT,item.image),bytes);}
  const previous=published.findIndex(p=>p.id===item.id);if(previous>=0)published[previous]=item;else published.push(item);
  await writeJSON(publicFile,published);const result=await build(config);draft.status='approved';await writeJSON(draftsFile,drafts);
  console.log(`Aprovação local salva: ${result.posts} publicação(ões), ${result.pages} páginas. Revise git diff e envie por PR. Nada foi enviado ao GitHub automaticamente.`);
}
try{
  if(!config||!Array.isArray(config.groups)||!Array.isArray(config.events))throw Error('Configuração inválida');
  if(command==='auto')await locked(async()=>{const api=new GitHub(await githubCredential());await collect({automatic:true});const result=await automaticPublish(api);console.log(result.baseline?'Referência inicial registrada. Os próximos posts novos serão publicados automaticamente.':`${result.published} publicação(ões) enviada(s) ao GitHub${result.commit?' no commit '+result.commit:''}.`);});
  else if(command==='collect')await locked(collect);
  else if(command==='import')await locked(async()=>{if(!args[0])throw Error('Informe o arquivo JSON de entrada');const file=path.resolve(args[0]);const stat=await fs.stat(file);if(stat.size>2*1024*1024)throw Error('Importação maior que 2 MiB');const inputs=JSON.parse(await fs.readFile(file,'utf8'));if(!Array.isArray(inputs)||inputs.length>50)throw Error('Use uma lista com no máximo 50 publicações');console.log(`${await stage(inputs)} rascunho(s). Nenhuma publicação automática.`);});
  else if(command==='list'){const drafts=await readJSON(draftsFile,[]);for(const d of drafts)console.log(JSON.stringify({id:d.id,status:d.status,url:d.url,text:d.text,suggestions:d.suggestions,imageWarning:d.imageWarning},null,2));if(!drafts.length)console.log('Nenhum rascunho.');}
  else if(command==='approve')await locked(approve);
  else if(command==='reject')await locked(async()=>{const drafts=await readJSON(draftsFile,[]),draft=drafts.find(d=>d.id===args[0]);if(!draft)throw Error('Rascunho não encontrado');draft.status='rejected';await writeJSON(draftsFile,drafts);console.log('Rascunho rejeitado.');});
  else if(command==='build')await locked(async()=>console.log(JSON.stringify(await build(config))));
  else console.log('Node 22+ · comandos: auto (systemd) | collect | import ARQUIVO.json | list | approve ID --title "Título" --tags "oficina:violino,evento:femuse" [--text-file ARQUIVO.txt] [--event-date AAAA-MM-DD --event-time "19h" --venue "Local"] | reject ID | build');
}catch(error){console.error(`Falha: ${error.message}${error.cause?.code ? ` (${error.cause.code})` : ""}`);process.exitCode=1;}
