// Sem JavaScript, os links abrem a versão ampliada leve de cada foto.
(() => {
  // Álbuns grandes mostram as primeiras fotos e liberam o restante sob demanda.
  const visible = 24;
  document.querySelectorAll('.photo-grid').forEach(grid => {
    const extra = [...grid.children].slice(visible);
    if (!extra.length) return;
    extra.forEach(item => { item.hidden = true; });
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'photo-more';
    more.textContent = `Ver mais ${extra.length} fotos`;
    more.addEventListener('click', () => { extra.forEach(item => { item.hidden = false; }); more.remove(); if (document.activeElement === document.body) extra[0].focus(); });
    grid.after(more);
  });
  const links = [...document.querySelectorAll('.gallery-photo')];
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-viewer';
  dialog.setAttribute('aria-label', 'Visualizador de fotos');
  dialog.innerHTML = '<div class="photo-viewer-toolbar"><button type="button" data-prev aria-label="Foto anterior">←</button><span aria-live="polite"></span><button type="button" data-next aria-label="Próxima foto">→</button><button type="button" data-close autofocus>Fechar ×</button></div><img alt=""><a target="_blank" rel="noopener noreferrer">Abrir foto original ↗</a>';
  document.body.append(dialog);
  const image = dialog.querySelector('img');
  let current = 0;
  function show(index) {
    current = (index + links.length) % links.length;
    const link = links[current];
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    dialog.querySelector('span').textContent = `${current + 1} / ${links.length}`;
    dialog.querySelector('a').href = link.dataset.original || link.href;
  }
  links.forEach((link, index) => link.addEventListener('click', event => {
    if(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); show(index); dialog.showModal();
  }));
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.querySelector('[data-prev]').onclick = () => show(current - 1);
  dialog.querySelector('[data-next]').onclick = () => show(current + 1);
  dialog.addEventListener('keydown', event => {
    if(event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    if(event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
  });
  dialog.addEventListener('click', event => { if(event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { image.removeAttribute('src'); const link = links[current];
    // Ao navegar até uma foto ainda recolhida, o álbum é aberto para o foco voltar a ela.
    if (link.hidden) link.closest('.photo-grid').nextElementSibling?.click();
    link.focus();
  });
})();
