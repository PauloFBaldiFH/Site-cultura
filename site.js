// Menu principal compartilhado por todas as páginas.
(() => {
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('#navigation');
  if (!menu || !nav) return;
  const close = () => { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); };
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('open')) { close(); menu.focus(); } });
})();
