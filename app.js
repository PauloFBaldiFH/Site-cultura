const workshops = [
 ['Artesanato','Artes'],['Crochê','Artes'],['Desenho artístico','Artes'],['Teatro','Artes'],['Arte circense','Artes'],['Corpo coreográfico','Dança'],['Baliza','Dança'],['Dança espanhola','Dança'],['Zumba','Dança'],['Frevo e ritmos','Dança'],['Dança alemã','Dança'],['Hip hop','Dança'],['Invernada artística','Dança'],['Dança italiana','Dança'],['Dança de salão','Dança'],['Aulas de canto','Música'],['Canto italiano','Música'],['Coral municipal','Música'],['Coral infantil','Música'],['Fanfarra','Música'],['Musicalização','Música'],['Viola caipira','Música'],['Bateria','Música'],['Saxofone','Música'],['Violino','Música'],['Clarinete','Música'],['Flauta transversal','Música']
];
let category = 'Todas';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function render() {
 const query = normalize(document.querySelector('#search').value.trim());
 const selected = workshops.filter(([name, area]) => (category === 'Todas' || area === category) && normalize(name).includes(query));
 document.querySelector('#workshop-list').replaceChildren(...selected.map(([name,area]) => {
  const row = document.createElement('tr');
  const title = document.createElement('th'); title.scope = 'row'; title.textContent = name;
  const field = document.createElement('td'); const tag = document.createElement('span'); tag.className = `tag ${area === 'Música' ? 'music' : area === 'Dança' ? 'dance' : 'arts'}`; tag.textContent = area === 'Artes' ? 'Artes e expressão' : area; field.append(tag);
  const action = document.createElement('td'); const link = document.createElement('a'); link.href = 'https://wa.me/554439131131?text=' + encodeURIComponent(`Olá! Gostaria de informações sobre a oficina de ${name}.`); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Consultar ↗'; link.setAttribute('aria-label',`Consultar oficina de ${name} pelo WhatsApp`); action.append(link); row.append(title,field,action); return row;
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
