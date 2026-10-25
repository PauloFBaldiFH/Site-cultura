const workshops = [
 ['Artesanato','Artes'],['Crochê','Artes'],['Desenho artístico','Artes'],['Teatro','Artes'],['Arte circense','Artes'],['Corpo coreográfico','Dança'],['Baliza','Dança'],['Dança espanhola','Dança'],['Zumba','Dança'],['Frevo e ritmos','Dança'],['Dança alemã','Dança'],['Hip hop','Dança'],['Invernada artística','Dança'],['Dança italiana','Dança'],['Dança de salão','Dança'],['Aulas de canto','Música'],['Canto italiano','Música'],['Coral municipal','Música'],['Coral infantil','Música'],['Fanfarra','Música'],['Musicalização','Música'],['Viola caipira','Música'],['Bateria','Música'],['Saxofone','Música'],['Violino','Música'],['Clarinete','Música'],['Flauta transversal','Música'],['Banda Sinfônica','Música']
];
const workshopSlug = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
let category = 'Todas';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function render() {
 const query = normalize(document.querySelector('#search').value.trim());
 const selected = workshops.filter(([name, area]) => (category === 'Todas' || area === category) && normalize(name).includes(query));
 document.querySelector('#workshop-cards').replaceChildren(...selected.map(([name, area]) => {
  const card = document.createElement('article'); card.className = 'workshop-card';
  const picture = document.createElement('div'); picture.className = 'workshop-illustration'; picture.setAttribute('role','img'); picture.setAttribute('aria-label', `Ilustração temática de ${name}`);
  const artIndex = workshops.findIndex(([title]) => title === name);
  // The generated collection has slightly different row heights; crop inside each scene.
  const artRows = [0,174,348,535,715,890,1065,1285];
  const artRow = Math.floor(artIndex / 4), top = artRows[artRow] + 5, height = artRows[artRow + 1] - artRows[artRow] - 10;
  picture.style.backgroundPosition = `${(artIndex % 4) * 100 / 3}% ${top * 100 / (1285 - height)}%`;
  picture.style.backgroundSize = `400% ${1285 * 100 / height}%`;
  const content = document.createElement('div'); const category = document.createElement('span'); category.className = 'space-label'; category.textContent = area;
  const heading = document.createElement('h3'); heading.textContent = name;
  const link = document.createElement('a'); link.className = 'button primary'; link.href = `oficinas/${workshopSlug(name)}.html`; link.textContent = 'Conhecer a oficina →'; link.setAttribute('aria-label', `Conhecer a oficina de ${name}`);
  content.append(category, heading, link); card.append(picture, content); return card;
 }));
 document.querySelector('#count').textContent = `${selected.length} ${selected.length === 1 ? 'oficina encontrada' : 'oficinas encontradas'}`;
 document.querySelector('#empty').hidden = selected.length > 0;
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed',String(item === button)); }); render(); }));
document.querySelector('#search').addEventListener('input',render);
const menu = document.querySelector('.menu');
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded',String(open)); document.querySelector('nav').classList.toggle('open',open); });
document.querySelectorAll('nav a').forEach(link => link.addEventListener('click',()=>{ menu.setAttribute('aria-expanded','false'); document.querySelector('nav').classList.remove('open'); }));
render();
