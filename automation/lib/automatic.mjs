import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {ROOT,STATE,readJSON,writeJSON} from './storage.mjs';
import {record,classify,imageExtension} from './core.mjs';
export const REPOSITORY='PauloFBaldiFH/Site-cultura';
const branch='main';
const safeFile=file=>file==='index.html'||file==='sitemap.xml'||file==='data/publicacoes.json'||file==='eventos/calendar-data.js'||/^(oficinas|eventos|espacos)\/[a-z0-9-]+\.html$/.test(file)||/^assets\/publicacoes\/ig-[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(file);
const gitHash=buffer=>createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
export class GitHub {
  constructor(token,fetchImpl=fetch){if(!/^[A-Za-z0-9_-]{20,300}$/.test(token))throw Error('Credencial GitHub ausente ou inválida');this.token=token;this.fetchImpl=fetchImpl;this.requests=0;}
  async request(method,endpoint,body){
    if(++this.requests>100)throw Error('Limite de requisições ao GitHub atingido');
    if(!endpoint.startsWith('/git/'))throw Error('Operação GitHub fora da lista permitida');
    const response=await this.fetchImpl(`https://api.github.com/repos/${REPOSITORY}${endpoint}`,{method,redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${this.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'CulturaPalotinaCollector/1.0'},...(body?{body:JSON.stringify(body)}:{})});
    if(!response.ok){await response.body?.cancel();throw Error(`GitHub respondeu HTTP ${response.status}. Confira credencial, Contents: Read and write e regras da branch. Nenhuma atualização forçada será feita.`);}
    const chunks=[];let total=0;for await(const chunk of response.body){total+=chunk.length;if(total>6*1024*1024)throw Error('Resposta GitHub excedeu 6 MiB');chunks.push(Buffer.from(chunk));}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  async snapshot(){const ref=await this.request('GET',`/git/ref/heads/${branch}`);const commit=await this.request('GET',`/git/commits/${ref.object.sha}`);const tree=await this.request('GET',`/git/trees/${commit.tree.sha}?recursive=1`);if(tree.truncated)throw Error('Árvore GitHub incompleta');return {head:ref.object.sha,tree:commit.tree.sha,files:new Map(tree.tree.filter(e=>e.type==='blob'&&e.mode==='100644').map(e=>[e.path,e.sha]))};}
  async read(snapshot,file){if(!safeFile(file)&&file!=='automation/config.json'&&file!=='data/content.json')throw Error('Arquivo de entrada não permitido');const sha=snapshot.files.get(file);if(!sha)throw Error(`Arquivo necessário não encontrado: ${file}`);const blob=await this.request('GET',`/git/blobs/${sha}`);if(blob.encoding!=='base64')throw Error('Codificação GitHub inesperada');const bytes=Buffer.from(blob.content.replace(/\s/g,''),'base64');if(bytes.length>2*1024*1024)throw Error('Arquivo de entrada maior que 2 MiB');return bytes;}
  async commit(snapshot,outputs,count){
    const changes=[];for(const [file,bytes]of outputs){if(!safeFile(file))throw Error('Tentativa de alterar arquivo não permitido');if(gitHash(bytes)===snapshot.files.get(file))continue;
      if(file.startsWith('assets/')){const blob=await this.request('POST','/git/blobs',{content:bytes.toString('base64'),encoding:'base64'});changes.push({path:file,mode:'100644',type:'blob',sha:blob.sha});}
      else changes.push({path:file,mode:'100644',type:'blob',content:bytes.toString('utf8')});
    }
    if(!changes.length)return null;
    const tree=await this.request('POST','/git/trees',{base_tree:snapshot.tree,tree:changes});
    const commit=await this.request('POST','/git/commits',{message:`Publica automaticamente ${count} publicação(ões) da Cultura`,tree:tree.sha,parents:[snapshot.head]});
    await this.request('PATCH',`/git/refs/heads/${branch}`,{sha:commit.sha,force:false});
    return commit.sha;
  }
}
export async function githubCredential(){const dir=process.env.CREDENTIALS_DIRECTORY;if(!dir)throw Error('Execute o modo automático pela unidade systemd com credencial configurada');return (await fs.readFile(path.join(dir,'github_token'),'utf8')).trim();}
export function autoTitle(text){return String(text).split(/\n/).map(s=>s.replace(/^[^\p{L}\p{N}]+/u,'').trim()).find(s=>s.length>=8)?.slice(0,110)||'Publicação da Cultura de Palotina';}
export function confirmedDate(text,tags){
  if(!tags.some(tag=>tag.startsWith('evento:')))return {};
  const values=[...String(text).matchAll(/\b(?:data|dia)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})(?!\d)/gi)].map(m=>m[1]);
  if(!values.length||new Set(values).size!==1)return {};
  const raw=values[0],date=raw.includes('/')?raw.split('/').reverse().map((s,i)=>i? s.padStart(2,'0'):s).join('-'):raw;
  if(!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)return {};
  // Announcements with an explicit range must not become a single-day event.
  if(/\b(?:a|até|ate)\s+\d{1,2}(?:\/|\b)|\b(?:de\s+\d{1,2}\s+a\s+\d{1,2})\b/i.test(text))return {};
  const times=[...text.matchAll(/hor[aá]rio\s*:\s*(\d{1,2}(?:h\d{0,2}|:\d{2}))/gi)];
  const venue=text.match(/local\s*:\s*([^\n]{3,160})/i);
  return {eventDate:date,eventTime:times.length===1?times[0][1]:'',eventLocation:venue?venue[1].trim():''};
}
function validateConfig(config){if(config.account!=='cultura_palotina'||!Array.isArray(config.groups)||config.groups.length>80||!Array.isArray(config.events)||config.events.length>40)throw Error('Configuração remota inválida');
  for(const group of config.groups){if(!/^(oficina|espaco):[a-z0-9-]+$/.test(group.id)||!Array.isArray(group.keywords)||!safeFile(group.url.split('#')[0]))throw Error('Categoria remota inválida');}
  for(const event of config.events)if(!/^[a-z0-9-]+$/.test(event.id)||!Array.isArray(event.keywords))throw Error('Evento remoto inválido');
}
async function history(item){const file=path.join(STATE,'automatic-history.json');const all=await readJSON(file,[]);all.push({...item,at:new Date().toISOString()});await writeJSON(file,all.slice(-365));}
export async function automaticPublish(api,{now=new Date()}={}){
  const snapshot=await api.snapshot();
  const current=JSON.parse((await api.read(snapshot,'data/publicacoes.json')).toString('utf8'));if(!Array.isArray(current))throw Error('Dados públicos remotos inválidos');
  const drafts=await readJSON(path.join(STATE,'drafts.json'),[]);const baselineFile=path.join(STATE,'automatic-baseline.json');const baseline=await readJSON(baselineFile,null);
  if(!baseline){await writeJSON(baselineFile,{enabledAt:now.toISOString(),ids:[...new Set([...drafts.map(d=>d.id),...current.map(p=>p.id)])]});await history({action:'baseline',ids:drafts.map(d=>d.id)});return {baseline:true,published:0};}
  const existing=new Set(current.map(p=>p.id)),initial=new Set(baseline.ids);
  const pending=drafts.filter(d=>d.status==='pending'&&!existing.has(d.id)&&!initial.has(d.id)&&(!d.publishedAt||Date.parse(d.publishedAt)>=Date.parse(baseline.enabledAt))).slice(0,6);
  if(!pending.length)return {published:0};
  const config=JSON.parse((await api.read(snapshot,'automation/config.json')).toString('utf8'));validateConfig(config);
  const temporary=await fs.mkdtemp(path.join(STATE,'automatic-run-'));
  try{
    await fs.mkdir(path.join(temporary,'automation/lib'),{recursive:true});for(const name of ['build.mjs','layout.mjs','storage.mjs','core.mjs','editorial.mjs'])await fs.copyFile(path.join(ROOT,'automation/lib',name),path.join(temporary,'automation/lib',name));
    const inputPaths=new Set(['index.html',...config.groups.map(group=>group.url.split('#')[0])]);
    for(const file of inputPaths){const bytes=await api.read(snapshot,file);await fs.mkdir(path.dirname(path.join(temporary,file)),{recursive:true});await fs.writeFile(path.join(temporary,file),bytes);}
    if(snapshot.files.has('data/content.json')){await fs.mkdir(path.join(temporary,'data'),{recursive:true});await fs.writeFile(path.join(temporary,'data/content.json'),await api.read(snapshot,'data/content.json'));}
    const media=new Map(),added=[];
    for(const draft of pending){const checked=record(draft,config);if(checked.id!==draft.id)throw Error('ID do rascunho não corresponde ao link');
      const tags=classify(checked.text,config).map(item=>item.id);if(!tags.length)tags.push('noticia:geral');
      const post={id:checked.id,url:checked.url,title:autoTitle(checked.text),text:checked.text,publishedAt:checked.publishedAt,hash:checked.hash,tags,...confirmedDate(checked.text,tags)};
      if(draft.media){if(!/^media\/ig-[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(draft.media))throw Error('Mídia inválida');try{const bytes=await fs.readFile(path.join(STATE,draft.media));if(bytes.length>1536*1024)throw Error('Imagem excedeu o limite');imageExtension(bytes);post.image='assets/publicacoes/'+path.basename(draft.media);media.set(post.image,bytes);}catch{console.error(`Miniatura indisponível para ${draft.id}; publicação seguirá em texto.`);}}
      added.push(post);
    }
    const merged=[...current,...added];await fs.mkdir(path.join(temporary,'data'),{recursive:true});await fs.writeFile(path.join(temporary,'data/publicacoes.json'),JSON.stringify(merged,null,2)+'\n');
    const {build}=await import(pathToFileURL(path.join(temporary,'automation/lib/build.mjs')).href);await build(config);
    const outputPaths=new Set([...inputPaths,'data/publicacoes.json','eventos/calendar-data.js','sitemap.xml','eventos/index.html',...config.groups.filter(g=>g.id.startsWith('espaco:')).map(g=>'espacos/'+g.id.split(':')[1]+'.html'),...config.events.map(event=>'eventos/'+event.id+'.html')]);
    const outputs=new Map(media);for(const file of outputPaths)outputs.set(file,await fs.readFile(path.join(temporary,file)));
    const sha=await api.commit(snapshot,outputs,added.length);
    if(!sha)throw Error('Publicações novas não produziram commit; estado preservado');
    const ids=new Set(added.map(p=>p.id));for(const draft of drafts)if(ids.has(draft.id)){draft.status='published';draft.publishedCommit=sha;}
    await writeJSON(path.join(STATE,'drafts.json'),drafts);await history({action:'published',commit:sha,previous:snapshot.head,ids:[...ids]});return {published:added.length,commit:sha};
  }finally{await fs.rm(temporary,{recursive:true,force:true});}
}
