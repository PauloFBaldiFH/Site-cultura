import fs from 'node:fs/promises';
import path from 'node:path';
import {escapeHTML as e,canonicalPost} from './core.mjs';
import {ROOT,readJSON} from './storage.mjs';
const base='https://cultura.palotina.org';
function cards(posts,prefix){return posts.map(post=>{
  if(!canonicalPost(post.url))throw Error('Publicação com URL inválida');
  const image=post.image&&/^assets\/publicacoes\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(post.image)?`<img src="${prefix}${e(post.image)}" alt="Imagem da publicação: ${e(post.title)}" loading="lazy" decoding="async">`:'';
  const date=post.publishedAt?`<time datetime="${e(post.publishedAt)}">Publicado em ${e(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'medium'}).format(new Date(post.publishedAt)))}</time>`:'';
  return `<article class="publication-card">${image}<div>${date}<h3>${e(post.title)}</h3><p>${e(post.text)}</p><a class="text-link" href="${e(post.url)}" target="_blank" rel="noopener noreferrer">Ver publicação no Instagram →</a></div></article>`;
}).join('');}
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
  if(typeof value!=='string'||!value.startsWith('assets/')||value.split('/').some(part=>part==='..'||part==='.')||/[\\\x00-\x1f]/.test(value)||! /\.(jpeg|jpg|png|webp)$/i.test(value))throw Error('Caminho de foto inválido');
  return value.split('/').map(encodeURIComponent).join('/');
}
function gallery(config,id){
  const groups=(config.galleries||[]).filter(g=>g.id===id);
  if(!groups.length)return '';
  return `<section class="photo-collection" aria-label="Acervo fotográfico"><h2>Galeria de fotos</h2><p>${groups.reduce((sum,g)=>sum+g.photos.length,0)} registros · Selecione uma foto para ampliar.</p>${groups.map(g=>`<section class="photo-album"><h3>${e(g.label)}</h3><div class="photo-grid">${g.photos.map((photo,i)=>`<a class="gallery-photo" href="../${e(assetURL(photo.src))}" aria-label="Ampliar foto ${i+1} — ${e(g.label)}"><img src="../${e(assetURL(photo.thumb))}" alt="${e(id==='teatro'?'Teatro Municipal em 2026':config.events.find(event=>event.id===id)?.name||id)} — ${e(g.label)}, foto ${i+1}" width="${Number(photo.width)||560}" height="${Number(photo.height)||420}" loading="lazy" decoding="async"></a>`).join('')}</div></section>`).join('')}</section>`;
}
function cover(config,id,prefix){const photo=(config.galleries||[]).find(g=>g.id===id)?.photos[0];return photo?`<img class="event-card-cover" src="${prefix}${e(assetURL(photo.thumb))}" alt="Registro de ${e(config.events.find(event=>event.id===id)?.name||id)}" width="${Number(photo.width)||560}" height="${Number(photo.height)||420}" loading="lazy" decoding="async">`:'';}
function page(title,description,url,content){return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} | Cultura Palotina</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${e(base+'/'+url)}"><link rel="icon" type="image/png" href="../assets/nova%20logo%20da%20cultura.png"><link rel="stylesheet" href="../style.css"><link rel="stylesheet" href="../visual.css"></head><body><header><a class="brand" href="../index.html"><img src="../assets/nova%20logo%20da%20cultura.png" alt="Cultura Palotina"><span>Cultura<span>PALOTINA</span></span></a><a class="text-link" href="${url.startsWith('espacos/')?'../index.html#espacos':'../eventos/index.html'}">${url.startsWith('espacos/')?'Todos os espaços':'Todos os eventos'} →</a></header><main class="section event-page"><div class="eyebrow">CULTURA · PALOTINA</div><h1>${e(title)}</h1><p>${e(description)}</p>${content}<a class="text-link" href="../index.html">← Voltar ao portal da Cultura</a></main><script src="../gallery.js" defer></script></body></html>`;}
export async function build(config){
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
    let content=article[0].replace(/src="assets\//g,'src="../assets/').replace(/href="espacos\//g,'href="../espacos/');
    const selected=sorted.filter(p=>p.tags.includes(group.id));
    const start='<!-- publicacoes:'+group.id+':start -->',end='<!-- publicacoes:'+group.id+':end -->';
    const a=content.indexOf(start),b=content.indexOf(end);
    if(a>=0&&b>a)content=content.slice(0,a)+content.slice(b+end.length);
    await fs.writeFile(path.join(ROOT,'espacos',slug+'.html'),page(group.name,'Conheça '+group.name+' em Palotina: endereço, atendimento e publicações.','espacos/'+slug+'.html',content+gallery(config,slug)+(selected.length?'<h2>Publicações deste espaço</h2><div class="publication-grid">'+cards(selected.slice(0,30),'../')+'</div>':'')));
  }
  const highlights=config.events.filter(event=>event.edition).map(event=>`<a class="event-highlight" href="eventos/${e(event.id)}.html">${cover(config,event.id,'')}<span class="eyebrow">${e(event.edition)}</span><h3>${e(event.name)}</h3><p>${e(event.description)}</p><span class="text-link">Explorar o evento →</span></a>`).join('');
  if(home.includes('<!-- eventos-destaque:start -->')){
    const updated=home.replace(/<!-- eventos-destaque:start -->[\s\S]*?<!-- eventos-destaque:end -->/,`<!-- eventos-destaque:start --><section class="section events-home" id="eventos"><div class="section-heading"><div><div class="eyebrow">ENCONTROS DA CULTURA</div><h2>Eventos que fazem<br><em>parte da cidade.</em></h2></div><a class="text-link" href="eventos/index.html">Todos os eventos →</a></div><div class="event-highlights">${highlights}</div></section><!-- eventos-destaque:end -->`);
    await fs.writeFile(path.join(ROOT,'index.html'),updated);
  }
  await fs.mkdir(path.join(ROOT,'eventos'),{recursive:true});
  for(const event of config.events){if(!/^[a-z0-9-]+$/.test(event.id))throw Error('ID de evento inválido');const selected=sorted.filter(post=>post.tags.includes('evento:'+event.id));const content=selected.length?`<h2>Publicações sobre o evento</h2><div class="publication-grid">${cards(selected.slice(0,30),'../')}</div>`:'<p>A programação e os detalhes das próximas edições serão publicados aqui quando confirmados.</p>';await fs.writeFile(path.join(ROOT,'eventos',event.id+'.html'),page(event.name,event.description,'eventos/'+event.id+'.html',(gallery(config,event.id)||(event.edition?`<h2>Edição ${e(event.edition)}</h2><p>Registros desta edição serão reunidos nesta página.</p><div class="event-parts">${event.parts.map(part=>`<section><h3>${e(part)}</h3><p>As fotos deste acervo ainda não foram disponibilizadas no site.</p></section>`).join('')}</div>`:''))+content));}
  const eventLinks=config.events.map(event=>`<article class="event-category">${cover(config,event.id,'../')}<span class="eyebrow">EVENTO CULTURAL</span><h2>${e(event.name)}</h2><p>${e(event.description)}</p><a class="button primary" href="${e(event.id)}.html">Conhecer o evento →</a></article>`).join('');
  await fs.writeFile(path.join(ROOT,'eventos/index.html'),page('Eventos culturais em Palotina','Explore Cultura Expo, Canta Palotina, Curso Biscuit, FEMUSE e Domingueira em Palotina.','eventos/index.html',`<div class="events-directory">${eventLinks}</div>`));
  const calendar=sorted.filter(p=>p.eventDate).map(p=>({date:p.eventDate,title:p.title,time:p.eventTime||'',location:p.eventLocation||''}));
  await fs.writeFile(path.join(ROOT,'eventos/calendar-data.js'),'// Gerado a partir de eventos aprovados. Não editar manualmente.\nwindow.CULTURA_IMPORTED_EVENTS = '+JSON.stringify(calendar,null,2).replace(/</g,'\\u003c')+';\n');
  const paths=['',...config.groups.filter(g=>g.id.startsWith('oficina:')).map(g=>g.url),...config.groups.filter(g=>g.id.startsWith('espaco:')).map(g=>'espacos/'+g.id.split(':')[1]+'.html'),'eventos/index.html',...config.events.map(event=>'eventos/'+event.id+'.html')];
  const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p=>`  <url><loc>${e(base+'/'+p)}</loc></url>`).join('\n')}\n</urlset>\n`;await fs.writeFile(path.join(ROOT,'sitemap.xml'),sitemap);
  return {posts:posts.length,pages:paths.length};
}
