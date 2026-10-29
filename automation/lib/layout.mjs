// Cabeçalho e rodapé compartilhados pelas páginas internas; o rodapé também é usado na página inicial.
// `prefix` é o caminho até a raiz do site: '' na página inicial e '../' nas pastas.
const whatsapp='https://wa.me/554439131131';
const instagram='https://www.instagram.com/cultura_palotina/';
const library='https://biblioteca.palotina.org/';
const external='target="_blank" rel="noopener noreferrer"';

export function brand(prefix,{alt='Cultura Palotina'}={}){
  return `<a class="brand" href="${prefix}index.html"><img src="${prefix}assets/logo-cultura-160.webp" alt="${alt}" width="160" height="160" decoding="async"><span>Cultura<span>PALOTINA</span></span></a>`;
}

export function siteHeader(prefix){
  return `<a class="skip-link" href="#conteudo">Pular para o conteúdo</a><header>${brand(prefix)}<button class="menu" aria-expanded="false" aria-controls="navigation">Menu ☰</button><nav id="navigation" aria-label="Principal"><a href="${prefix}index.html#sobre">A nossa cultura</a><a href="${prefix}index.html#oficinas">Oficinas</a><a href="${prefix}index.html#espacos">Espaços culturais</a><a href="${prefix}eventos/index.html">Eventos</a><a href="${prefix}index.html#mapa">Onde estamos</a><a class="nav-library" href="${library}" ${external}>Biblioteca →</a></nav></header>`;
}

export function siteFooter(prefix){
  return `<footer class="site-footer"><div class="footer-brand">${brand(prefix,{alt:''})}<p>Arte que conecta. Cultura que pertence.</p></div><div class="footer-column"><h2>Visite</h2><p>Departamento de Cultura<br>Rua Eurico Gaspar Dutra, 706 — Centro<br>Palotina — PR</p><p>7h30 às 11h30 · 13h30 às 17h30</p></div><div class="footer-column"><h2>Fale com a Cultura</h2><a href="tel:+554439131131">(44) 3913-1131</a><a href="${whatsapp}" ${external}>WhatsApp →</a><a href="${instagram}" ${external}>@cultura_palotina →</a></div><div class="footer-column"><h2>Navegue</h2><a href="${prefix}index.html#oficinas">Oficinas</a><a href="${prefix}index.html#espacos">Espaços culturais</a><a href="${prefix}eventos/index.html">Eventos</a><a href="${library}" ${external}>Biblioteca online →</a></div><div class="footer-bottom"><span>Departamento de Cultura · Palotina, Paraná</span><a href="#">Voltar ao topo ↑</a></div></footer>`;
}

export function headLinks(prefix){
  return `<link rel="icon" type="image/png" href="${prefix}assets/favicon.png"><link rel="apple-touch-icon" href="${prefix}assets/apple-touch-icon.png">`;
}
