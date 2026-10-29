import fs from 'node:fs/promises';
import path from 'node:path';
import {escapeHTML as e,canonicalPost} from './core.mjs';
import {ROOT,readJSON} from './storage.mjs';
import {siteHeader,siteFooter,headLinks} from './layout.mjs';
import {applyEditorial,paragraphs,editorialPhotos} from './editorial.mjs';
const base='https://cultura.palotina.org';
function cards(posts,prefix){return posts.map(post=>{
  if(!canonicalPost(post.url))throw Error('Publicação com URL inválida');
  const image=post.image&&/^assets\/publicacoes\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(post.image)?`<img src="${prefix}${e(post.image)}" alt="Imagem da publicação: ${e(post.title)}" loading="lazy" decoding="async">`:'';
  const date=post.publishedAt?`<time datetime="${e(post.publishedAt)}">Publicado em ${e(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'medium'}).format(new Date(post.publishedAt)))}</time>`:'';
  return `<article class="publication-card">${image}<div>${date}<h3>${e(post.title)}</h3><p>${e(displayText(post.text))}</p><a class="text-link" href="${e(post.url)}" target="_blank" rel="noopener noreferrer">Ver publicação no Instagram →</a></div></article>`;
}).join('');}
// Hashtags continuam no arquivo de dados, mas não aparecem no texto exibido.
function displayText(text){return text.replace(/(^|\s)#[\p{L}\p{N}_]+/gu,'$1').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
function section(posts,key,prefix){
  if(!posts.length)return '';
  if(key.startsWith('espaco:'))return `<details class="institution-publications"><summary>Publicações da Cultura <span>${posts.length}</span></summary><div class="publication-grid">${cards(posts,prefix)}</div></details>`;
  return `<section class="publication-section" aria-label="Publicações sobre este assunto"><h2>Publicações da Cultura</h2><div class="publication-grid">${cards(posts,prefix)}</div></section>`;
}
async function replaceBlock(file,key,content){
  let html=await fs.readFile(file,'utf8');const start=`<!-- publicacoes:${key}:start -->`,end=`<!-- publicacoes:${key}:end -->`;
  const a=html.indexOf(start),b=html.indexOf(end);if(a<0||b<a)throw Error(`Bloco ${key} não encontrado em ${file}`);
  html=html.slice(0,a+start.length)+content+html.slice(b);await fs.writeFile(file,html);
}
function assetURL(value){
  if(typeof value!=='string'||!value.startsWith('assets/')||value.split('/').some(part=>part==='..'||part==='.')||/[\\\x00-\x1f]/.test(value)||! /\.(jpeg|jpg|png|webp|mp4)$/i.test(value))throw Error('Caminho de foto inválido');
  return value.split('/').map(encodeURIComponent).join('/');
}
function gallery(config,id){
  const groups=(config.galleries||[]).filter(g=>g.id===id);
  if(!groups.length)return '';
  return `<section class="photo-collection" aria-label="Acervo fotográfico"><h2>Galeria de fotos</h2><p>${groups.reduce((sum,g)=>sum+g.photos.length,0)} registros · Selecione uma foto para ampliar.</p>${groups.map(g=>`<section class="photo-album"><h3>${e(g.label)}</h3><div class="photo-grid">${g.photos.map((photo,i)=>`<a class="gallery-photo" href="../${e(assetURL(photo.large||photo.src))}" data-original="../${e(assetURL(photo.src))}" aria-label="Ampliar foto ${i+1} — ${e(g.label)}"><img src="../${e(assetURL(photo.thumb))}" alt="${e(id==='teatro'?'Teatro Municipal em 2026':config.events.find(event=>event.id===id)?.name||id)} — ${e(g.label)}, foto ${i+1}" width="${Number(photo.width)||560}" height="${Number(photo.height)||420}" loading="lazy" decoding="async"></a>`).join('')}</div>${(g.videos||[]).length?`<h3>Vídeos</h3><div class="album-videos">${g.videos.map((video,i)=>`<figure><video controls preload="none" playsinline aria-label="Vídeo ${i+1} — ${e(g.label)}"><source src="../${e(assetURL(video))}" type="video/mp4"></video><figcaption>Vídeo ${i+1} · ${e(g.label)}</figcaption></figure>`).join('')}</div>`:''}</section>`).join('')}</section>`;
}
function cover(config,id,prefix){const photo=(config.galleries||[]).find(g=>g.id===id)?.photos[0];return photo?`<img class="event-card-cover" src="${prefix}${e(assetURL(photo.thumb))}" alt="Registro de ${e(config.events.find(event=>event.id===id)?.name||id)}" width="${Number(photo.width)||560}" height="${Number(photo.height)||420}" loading="lazy" decoding="async">`:'';}
function backLink(url){
  if(url.startsWith('espacos/'))return '<a class="text-link page-back" href="../index.html#espacos">← Todos os espaços</a>';
  if(url==='eventos/index.html')return '<a class="text-link page-back" href="../index.html">← Início</a>';
  return '<a class="text-link page-back" href="../eventos/index.html">← Todos os eventos</a>';
}
function page(title,description,url,content){return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} | Cultura Palotina</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${e(base+'/'+url)}">${headLinks('../')}<link rel="stylesheet" href="../style.css"><link rel="stylesheet" href="../visual.css"></head><body>${siteHeader('../')}<main class="section event-page" id="conteudo">${backLink(url)}<div class="eyebrow">CULTURA · PALOTINA</div><h1>${e(title)}</h1><p>${e(description)}</p>${content}<a class="text-link" href="../index.html">← Voltar ao portal da Cultura</a></main>${siteFooter('../')}<script src="../site.js" defer></script><script src="../gallery.js" defer></script></body></html>`;}
// Mantém cabeçalho e rodapé iguais nas páginas escritas à mão (página inicial e oficinas).
async function replaceLayout(file,key,content){
  let html=await fs.readFile(file,'utf8');const start=`<!-- layout:${key}:start -->`,end=`<!-- layout:${key}:end -->`;
  const a=html.indexOf(start),b=html.indexOf(end);if(a<0||b<a)return;
  html=html.slice(0,a+start.length)+content+html.slice(b);await fs.writeFile(file,html);
}
async function syncLayout(config){
  await replaceLayout(path.join(ROOT,'index.html'),'footer',siteFooter(''));
  for(const group of config.groups.filter(g=>g.id.startsWith('oficina:'))){
    const file=path.join(ROOT,group.url.split('#')[0]);
    await replaceLayout(file,'header',siteHeader('../'));await replaceLayout(file,'footer',siteFooter('../'));
  }
  // A página 404 é servida em qualquer endereço, por isso usa caminhos absolutos.
  const notFound=`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página não encontrada | Cultura Palotina</title><meta name="robots" content="noindex">${headLinks('/')}<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/visual.css"></head><body>${siteHeader('/')}<main class="section event-page not-found" id="conteudo"><div class="eyebrow">ERRO 404</div><h1>Esta página saiu de cena.</h1><p>O endereço pode ter mudado ou ter sido digitado com algum erro. Veja alguns caminhos para continuar:</p><div class="actions"><a class="button primary" href="/">Ir para o início →</a><a class="text-link" href="/#oficinas">Ver as oficinas</a><a class="text-link" href="/eventos/index.html">Ver os eventos</a></div></main>${siteFooter('/')}<script src="/site.js" defer></script></body></html>`;
  await fs.writeFile(path.join(ROOT,'404.html'),notFound);
}
export async function build(config){
  config=structuredClone(config);
  await applyEditorial(config);
  const posts=await readJSON(path.join(ROOT,'data/publicacoes.json'),[]);if(!Array.isArray(posts))throw Error('Arquivo público inválido');
  const ids=new Set();for(const post of posts){if(!post.id||ids.has(post.id)||typeof post.title!=='string'||typeof post.text!=='string'||!Array.isArray(post.tags))throw Error('Publicação pública inválida ou duplicada');ids.add(post.id);if(post.publishedAt&&!Number.isFinite(Date.parse(post.publishedAt)))throw Error('Data de publicação inválida');}
  const sorted=[...posts].sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||'')||a.id.localeCompare(b.id));
  for(const group of config.groups){const selected=sorted.filter(post=>post.tags.includes(group.id)).slice(0,group.id.startsWith('espaco:')?2:6);await replaceBlock(path.join(ROOT,group.url.split('#')[0]),group.id,section(selected,group.id,group.id.startsWith('oficina:')?'../':''));}
  await replaceBlock(path.join(ROOT,'index.html'),'noticias',sorted.length?`<section class="section publications-home" aria-labelledby="publications-title"><div class="eyebrow">ACONTECE NA CULTURA</div><h2 id="publications-title">Notícias e encontros</h2><div class="publication-grid">${cards(sorted.slice(0,6),'')}</div></section>`:'');
  const home=await fs.readFile(path.join(ROOT,'index.html'),'utf8');
  await fs.mkdir(path.join(ROOT,'espacos'),{recursive:true});
  for(const group of config.groups.filter(g=>g.id.startsWith('espaco:'))){
    const slug=group.id.split(':')[1];
    const article=home.match(new RegExp('<article class="institution-card" id="'+slug+'"[\\s\\S]*?</article>'));
    if(!article)throw Error('Espaço não encontrado: '+slug);
    let content=article[0].replace(/(["\s,])assets\//g,'$1../assets/').replace(/href="espacos\//g,'href="../espacos/');
    const selected=sorted.filter(p=>p.tags.includes(group.id));
    const start='<!-- publicacoes:'+group.id+':start -->',end='<!-- publicacoes:'+group.id+':end -->';
    const a=content.indexOf(start),b=content.indexOf(end);
    if(a>=0&&b>a)content=content.slice(0,a)+content.slice(b+end.length);
    await fs.writeFile(path.join(ROOT,'espacos',slug+'.html'),page(group.name,'Conheça '+group.name+' em Palotina: endereço, atendimento e publicações.','espacos/'+slug+'.html',content+gallery(config,slug)+(selected.length?'<h2>Publicações deste espaço</h2><div class="publication-grid">'+cards(selected.slice(0,30),'../')+'</div>':'')));
  }
  const highlights=config.events.filter(event=>event.edition&&event.visible!==false).map(event=>`<a class="event-highlight" href="eventos/${e(event.id)}.html">${cover(config,event.id,'')}<span class="eyebrow">${e(event.edition)}</span><h3>${e(event.name)}</h3><p>${e(event.description)}</p><span class="text-link">Explorar o evento →</span></a>`).join('');
  if(home.includes('<!-- eventos-destaque:start -->')){
    const updated=home.replace(/<!-- eventos-destaque:start -->[\s\S]*?<!-- eventos-destaque:end -->/,`<!-- eventos-destaque:start --><section class="section events-home" id="eventos"><div class="section-heading"><div><div class="eyebrow">ENCONTROS DA CULTURA</div><h2>Eventos que fazem<br><em>parte da cidade.</em></h2></div><a class="text-link" href="eventos/index.html">Todos os eventos →</a></div><div class="event-highlights">${highlights}</div></section><!-- eventos-destaque:end -->`);
    await fs.writeFile(path.join(ROOT,'index.html'),updated);
  }
  await fs.mkdir(path.join(ROOT,'eventos'),{recursive:true});
  for(const event of config.events){if(!/^[a-z0-9-]+$/.test(event.id))throw Error('ID de evento inválido');const selected=sorted.filter(post=>post.tags.includes('evento:'+event.id));const content=selected.length?`<h2>Publicações sobre o evento</h2><div class="publication-grid">${cards(selected.slice(0,30),'../')}</div>`:'<p>A programação e os detalhes das próximas edições serão publicados aqui quando confirmados.</p>';await fs.writeFile(path.join(ROOT,'eventos',event.id+'.html'),page(event.name,event.description,'eventos/'+event.id+'.html',(paragraphs(event.body||'')+editorialPhotos(event.photos||[])+(gallery(config,event.id)||(event.edition?`<h2>Edição ${e(event.edition)}</h2><p>Registros desta edição serão reunidos nesta página.</p><div class="event-parts">${event.parts.map(part=>`<section><h3>${e(part)}</h3><p>As fotos deste acervo ainda não foram disponibilizadas no site.</p></section>`).join('')}</div>`:'')))+content));}
  const eventLinks=config.events.filter(event=>event.visible!==false).map(event=>`<article class="event-category">${cover(config,event.id,'../')}<span class="eyebrow">EVENTO CULTURAL</span><h2>${e(event.name)}</h2><p>${e(event.description)}</p><a class="button primary" href="${e(event.id)}.html">Conhecer o evento →</a></article>`).join('');
  await fs.writeFile(path.join(ROOT,'eventos/index.html'),page('Eventos culturais em Palotina','Explore os registros de Canta Palotina e FEMUSE em Palotina.','eventos/index.html',`<div class="events-directory">${eventLinks}</div>`));
  const calendar=sorted.filter(p=>p.eventDate).map(p=>({date:p.eventDate,title:p.title,time:p.eventTime||'',location:p.eventLocation||''}));
  await fs.writeFile(path.join(ROOT,'eventos/calendar-data.js'),'// Gerado a partir de eventos aprovados. Não editar manualmente.\nwindow.CULTURA_IMPORTED_EVENTS = '+JSON.stringify(calendar,null,2).replace(/</g,'\\u003c')+';\n');
  const paths=['',...config.groups.filter(g=>g.id.startsWith('oficina:')).map(g=>g.url),...config.groups.filter(g=>g.id.startsWith('espaco:')).map(g=>'espacos/'+g.id.split(':')[1]+'.html'),'eventos/index.html',...config.events.map(event=>'eventos/'+event.id+'.html')];
  const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p=>`  <url><loc>${e(base+'/'+p)}</loc></url>`).join('\n')}\n</urlset>\n`;await fs.writeFile(path.join(ROOT,'sitemap.xml'),sitemap);
  await syncLayout(config);
  return {posts:posts.length,pages:paths.length};
}
