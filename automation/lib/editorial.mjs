import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,readJSON} from './storage.mjs';
import {escapeHTML as e} from './core.mjs';
const text=(value,max=12000)=>{if(typeof value!=='string'||value.length>max)throw Error('Texto editorial inválido');return value;};
export const paragraphs=value=>text(value).split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${e(p).replace(/\n/g,'<br>')}</p>`).join('');
export function editorialPhotos(photos=[],prefix='../'){
  if(!Array.isArray(photos)||photos.length>100)throw Error('Galeria editorial inválida');
  return photos.length?'<section class="photo-collection"><h2>Mais registros</h2><div class="photo-grid">'+photos.map(photo=>{
    const image=text(photo.image,500).replace(/^\//,'');
    if(!/^assets\/[A-Za-z0-9_ /().%-]+\.(png|jpe?g|webp)$/i.test(image)||image.split('/').some(s=>s==='..'||s==='.'))throw Error('Imagem editorial inválida');
    return `<a class="gallery-photo" href="${prefix}${e(image.split('/').map(encodeURIComponent).join('/'))}"><img src="${prefix}${e(image.split('/').map(encodeURIComponent).join('/'))}" alt="${e(text(photo.caption,300))}" loading="lazy" decoding="async" width="560" height="420"></a>`;
  }).join('')+'</div></section>':'';
}
export async function applyEditorial(config){
  const content=await readJSON(path.join(ROOT,'data/content.json'),null);if(!content)return null;
  for(const key of ['events','spaces','workshops'])if(!Array.isArray(content[key]))throw Error('Conteúdo editorial inválido');
  // IDs fixos preservam URLs, mapa e associações do importador.
  for(const [key,known] of [['events',config.events.map(e=>e.id)],['spaces',config.groups.filter(g=>g.id.startsWith('espaco:')).map(g=>g.id.split(':')[1])],['workshops',config.groups.filter(g=>g.id.startsWith('oficina:')).map(g=>g.id.split(':')[1])]]){
    if(content[key].length!==known.length||new Set(content[key].map(item=>item.id)).size!==known.length||content[key].some(item=>!known.includes(item.id)))throw Error('Categorias editoriais não correspondem ao site');
    for(const item of content[key])text(item.name,200);
  }
  for(const item of content.events){text(item.description);text(item.body);text(item.edition,20);editorialPhotos(item.photos);Object.assign(config.events.find(event=>event.id===item.id),{...item});}
  let home=await fs.readFile(path.join(ROOT,'index.html'),'utf8');
  const hero=content.home;
  home=home.replace(/(<section class="hero"[\s\S]*?<h1>)[\s\S]*?<\/h1><p>[\s\S]*?<\/p>/,(_,start)=>`${start}${e(text(hero.title,200))}<br><em>${e(text(hero.accent,200))}</em></h1><p>${e(text(hero.intro))}</p>`);
  for(const space of content.spaces){
    config.groups.find(group=>group.id==='espaco:'+space.id).name=space.name;
    text(space.description);
    if(!Array.isArray(space.information)||space.information.length>10)throw Error('Informações do espaço inválidas');
    const info=space.information.map(item=>`<h4>${e(text(item.label,100))}</h4>${paragraphs(item.text)}`).join('');
    const re=new RegExp('(<article class="institution-card" id="'+space.id+'"[\\s\\S]*?<h3[^>]*>)[\\s\\S]*?</h3><p class="institution-description">[\\s\\S]*?</p><div class="institution-info">[\\s\\S]*?</div>');
    home=home.replace(re,(_,start)=>`${start}${e(space.name)}</h3><p class="institution-description">${e(space.description)}</p><div class="institution-info">${info}</div>`);
  }
  await fs.writeFile(path.join(ROOT,'index.html'),home);
  for(const workshop of content.workshops){
    if(!Array.isArray(workshop.paragraphs)||!workshop.paragraphs.length||workshop.paragraphs.length>20)throw Error('Texto da oficina inválido');
    const file=path.join(ROOT,'oficinas',workshop.id+'.html');let html=await fs.readFile(file,'utf8');
    // Um bloco com marcadores impede alterar publicações ou links de contato.
    const start='<!-- editorial:start -->',end='<!-- editorial:end -->';
    const body=workshop.paragraphs.map(p=>paragraphs(p)).join('');
    if(html.includes(start))html=html.replace(/<!-- editorial:start -->[\s\S]*?<!-- editorial:end -->/,()=>start+body+end);
    else html=html.replace(/(<main[\s\S]*?<h2>[^<]*<\/h2>)(?:<p>[\s\S]*?<\/p>)+/,(_,heading)=>heading+start+body+end);
    await fs.writeFile(file,html);
  }
  return content;
}
