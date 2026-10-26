import {createHash} from 'node:crypto';
export const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function canonicalPost(value) {
  try {const u=new URL(value);if(!['instagram.com','www.instagram.com'].includes(u.hostname)||u.protocol!=='https:')return null;
    const m=u.pathname.match(/^\/(p|reel)\/([A-Za-z0-9_-]{3,80})\/?$/);return m?`https://www.instagram.com/${m[1]}/${m[2]}/`:null;
  }catch{return null;}
}
export function classify(text,config) {
  const input=` ${normalize(text)} `;
  return [...config.groups,...config.events.map(e=>({...e,id:'evento:'+e.id}))].map(group=>{
    const evidence=group.keywords.filter(word=>input.includes(` ${normalize(word)} `));
    return {id:group.id,evidence,score:evidence.length};
  }).filter(group=>group.score).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
export function postId(url){const safe=canonicalPost(url);if(!safe)throw Error('Link de publicação inválido');return 'ig-'+safe.split('/')[4];}
export function record(input,config){
  const url=canonicalPost(input.url);if(!url)throw Error('Use um link público /p/ ou /reel/ do Instagram');
  const text=String(input.text||'').trim();if(text.length<10||text.length>20000)throw Error('Legenda ausente ou fora do limite de 10–20000 caracteres');
  const publishedAt=input.publishedAt&&Number.isFinite(Date.parse(input.publishedAt))?new Date(input.publishedAt).toISOString():null;
  return {id:postId(url),url,text,publishedAt,imageUrl:typeof input.imageUrl==='string'?input.imageUrl:null,hash:createHash('sha256').update(text).digest('hex'),suggestions:classify(text,config)};
}
const decode=value=>String(value).replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
export function jsonScripts(html){
  const output=[];for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
    if(!/type\s*=\s*["']application\/(?:ld\+)?json["']/i.test(match[1]))continue;
    try{output.push(JSON.parse(match[2]));}catch{}
  }return output;
}
function walk(value,visit,depth=0){if(depth>35||!value||typeof value!=='object')return;visit(value);for(const child of Object.values(value))walk(child,visit,depth+1);}
export function parseProfile(html,account){
  const posts=new Map();for(const script of jsonScripts(html))walk(script,node=>{
    const code=node.shortcode||node.code;
    const text=node.edge_media_to_caption?.edges?.[0]?.node?.text||node.caption?.text||(typeof node.caption==='string'?node.caption:null);
    const owner=node.owner?.username||node.user?.username;
    if(code&&text&&(!owner||owner.toLowerCase()===account.toLowerCase())){
      const url=canonicalPost(`https://www.instagram.com/${node.is_video?'reel':'p'}/${code}/`);
      if(url)posts.set(url,{url,text,publishedAt:node.taken_at_timestamp?new Date(node.taken_at_timestamp*1000).toISOString():null,imageUrl:node.display_url||node.image_versions2?.candidates?.[0]?.url||null});
    }
  });
  const links=new Set();for(const match of html.matchAll(/(?:href|"url")\s*[=:]\s*["']([^"']+)["']/gi)){
    const raw=decode(match[1]);const url=canonicalPost(raw.startsWith('/')?'https://www.instagram.com'+raw:raw);if(url)links.add(url);
  }
  for(const url of posts.keys())links.add(url);
  return {posts:[...posts.values()],links:[...links]};
}
export function parsePost(html,url,account){
  const candidates=[];for(const script of jsonScripts(html))walk(script,node=>{
    const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
    if(types.some(type=>['SocialMediaPosting','ImageObject','VideoObject'].includes(type))){
      const text=node.articleBody||node.caption||node.description;
      if(typeof text==='string')candidates.push({url,text,publishedAt:node.datePublished||node.uploadDate,imageUrl:typeof node.image==='string'?node.image:node.thumbnailUrl});
    }
  });
  const profile=parseProfile(html,account);const exact=profile.posts.find(item=>postId(item.url)===postId(url));if(exact)return {...exact,url};
  if(candidates.length)return candidates.sort((a,b)=>b.text.length-a.text.length)[0];
  const metas={};for(const match of html.matchAll(/<meta\b([^>]+)>/gi)){
    const attrs={};for(const a of match[1].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[a[1].toLowerCase()]=decode(a[2]??a[3]);
    if(attrs.property||attrs.name)metas[attrs.property||attrs.name]=attrs.content;
  }
  const pageUrl=canonicalPost(metas['og:url']);
  if(pageUrl&&postId(pageUrl)===postId(url)&&metas['og:description']?.length>20)return {url,text:metas['og:description'],imageUrl:metas['og:image'],publishedAt:metas['article:published_time']};
  throw Error('Instagram não disponibilizou a legenda pública. Pode exigir login ou ter mudado o HTML. Nenhum conteúdo foi publicado.');
}
export async function fetchBounded(input,{media=false,fetchImpl=fetch,limit=2*1024*1024}={}){
  let url=new URL(input);
  for(let redirects=0;redirects<4;redirects++){
    const allowed=media?/^(?:[a-z0-9-]+\.)*(?:cdninstagram\.com|fbcdn\.net)$/.test(url.hostname):['instagram.com','www.instagram.com'].includes(url.hostname);
    if(url.protocol!=='https:'||url.port||url.username||url.password||!allowed)throw Error('Destino de rede fora da lista permitida');
    if(!media&&/^\/accounts\/|^\/challenge\//.test(url.pathname))throw Error('Instagram exige login; coleta interrompida');
    const response=await fetchImpl(url,{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'CulturaPalotinaCollector/1.0','Accept':media?'image/*':'text/html'}});
    if([301,302,303,307,308].includes(response.status)){await response.body?.cancel();url=new URL(response.headers.get('location'),url);continue;}
    if(!response.ok){await response.body?.cancel();throw Error(`Serviço respondeu HTTP ${response.status}; coleta interrompida`);}
    if(Number(response.headers.get('content-length'))>limit){await response.body?.cancel();throw Error('Resposta maior que o limite permitido');}
    const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>limit){await response.body.cancel().catch(()=>{});throw Error('Resposta maior que o limite permitido');}chunks.push(Buffer.from(chunk));}
    return Buffer.concat(chunks);
  }throw Error('Redirecionamentos excessivos');
}
export function imageExtension(buffer){if(buffer.subarray(0,3).equals(Buffer.from([255,216,255])))return 'jpg';if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'webp';throw Error('Miniatura não é JPEG, PNG ou WebP');}
export function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
