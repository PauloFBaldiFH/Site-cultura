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
function section(posts,key,prefix){if(!posts.length)return '';return `<section class="publication-section" aria-label="Publicações sobre este assunto"><h2>Publicações da Cultura</h2><div class="publication-grid">${cards(posts,prefix)}</div></section>`;}
async function replaceBlock(file,key,content){
  let html=await fs.readFile(file,'utf8');const start=`<!-- publicacoes:${key}:start -->`,end=`<!-- publicacoes:${key}:end -->`;
  const a=html.indexOf(start),b=html.indexOf(end);if(a<0||b<a)throw Error(`Bloco ${key} não encontrado em ${file}`);
  html=html.slice(0,a+start.length)+content+html.slice(b);await fs.writeFile(file,html);
}
function page(title,description,url,content){return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} | Cultura Palotina</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${e(base+'/'+url)}"><link rel="icon" type="image/png" href="../assets/nova%20logo%20da%20cultura.png"><link rel="stylesheet" href="../style.css"><link rel="stylesheet" href="../visual.css"></head><body><header><a class="brand" href="../index.html"><img src="../assets/nova%20logo%20da%20cultura.png" alt="Cultura Palotina"><span>Cultura<span>PALOTINA</span></span></a><a class="text-link" href="index.html">Todos os eventos →</a></header><main class="section event-page"><div class="eyebrow">EVENTOS · PALOTINA</div><h1>${e(title)}</h1><p>${e(description)}</p>${content}<a class="text-link" href="../index.html">← Voltar ao portal da Cultura</a></main></body></html>`;}
export async function build(config){
  const posts=await readJSON(path.join(ROOT,'data/publicacoes.json'),[]);if(!Array.isArray(posts))throw Error('Arquivo público inválido');
  const ids=new Set();for(const post of posts){if(!post.id||ids.has(post.id)||typeof post.title!=='string'||typeof post.text!=='string'||!Array.isArray(post.tags))throw Error('Publicação pública inválida ou duplicada');ids.add(post.id);if(post.publishedAt&&!Number.isFinite(Date.parse(post.publishedAt)))throw Error('Data de publicação inválida');}
  const sorted=[...posts].sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||'')||a.id.localeCompare(b.id));
  for(const group of config.groups){const selected=sorted.filter(post=>post.tags.includes(group.id)).slice(0,group.id.startsWith('espaco:')?2:6);await replaceBlock(path.join(ROOT,group.url.split('#')[0]),group.id,section(selected,group.id,group.id.startsWith('oficina:')?'../':''));}
  await replaceBlock(path.join(ROOT,'index.html'),'noticias',sorted.length?`<section class="section publications-home" aria-labelledby="publications-title"><div class="eyebrow">ACONTECE NA CULTURA</div><h2 id="publications-title">Notícias e encontros</h2><div class="publication-grid">${cards(sorted.slice(0,6),'')}</div></section>`:'');
  await fs.mkdir(path.join(ROOT,'eventos'),{recursive:true});
  for(const event of config.events){if(!/^[a-z0-9-]+$/.test(event.id))throw Error('ID de evento inválido');const selected=sorted.filter(post=>post.tags.includes('evento:'+event.id));const content=selected.length?`<h2>Publicações sobre o evento</h2><div class="publication-grid">${cards(selected.slice(0,30),'../')}</div>`:'<p>A programação e os detalhes das próximas edições serão publicados aqui quando confirmados.</p>';await fs.writeFile(path.join(ROOT,'eventos',event.id+'.html'),page(event.name,event.description,'eventos/'+event.id+'.html',content));}
  const eventLinks=config.events.map(event=>`<article class="event-category"><span class="eyebrow">EVENTO CULTURAL</span><h2>${e(event.name)}</h2><p>${e(event.description)}</p><a class="button primary" href="${e(event.id)}.html">Conhecer o evento →</a></article>`).join('');
  await fs.writeFile(path.join(ROOT,'eventos/index.html'),page('Eventos culturais em Palotina','Acompanhe as publicações sobre FEMUSE, Canta Palotina, Domingueira e outros encontros da Cultura.','eventos/index.html',`<div class="events-directory">${eventLinks}</div>`));
  const calendar=sorted.filter(p=>p.eventDate).map(p=>({date:p.eventDate,title:p.title,time:p.eventTime||'',location:p.eventLocation||''}));
  await fs.writeFile(path.join(ROOT,'eventos/calendar-data.js'),'// Gerado a partir de eventos aprovados. Não editar manualmente.\nwindow.CULTURA_IMPORTED_EVENTS = '+JSON.stringify(calendar,null,2).replace(/</g,'\\u003c')+';\n');
  const paths=['',...config.groups.filter(g=>g.id.startsWith('oficina:')).map(g=>g.url),'eventos/index.html',...config.events.map(event=>'eventos/'+event.id+'.html')];
  const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p=>`  <url><loc>${e(base+'/'+p)}</loc></url>`).join('\n')}\n</urlset>\n`;await fs.writeFile(path.join(ROOT,'sitemap.xml'),sitemap);
  return {posts:posts.length,pages:paths.length};
}
