(() => {
  const places = [
    {id:'departamento',name:'Departamento de Cultura',address:'Rua Eurico Gaspar Dutra, 706 — Centro',point:[-53.840933,-24.289374]},
    {id:'biblioteca',name:'Biblioteca Pública Municipal Castro Alves',address:'Rua Ipiranga, 720 — Centro',queries:['Biblioteca Castro Alves Palotina','Rua Ipiranga 720 Palotina']},
    {id:'teatro',name:'Teatro Municipal Ludovico Riedi',address:'Rua Getúlio Vargas — Centro',queries:['Teatro Ludovico Riedi Palotina','Rua Getúlio Vargas Palotina']},
    {id:'museu',name:'Museu Municipal Antônio Bernardino Daniel',address:'Rua 24 de Junho, s/n — Lago Municipal',queries:['Museu Palotina','Rua 24 de Junho Palotina']},
    {id:'gasparzinho',name:'Escola Municipal de Artes Gasparzinho',address:'Palotina — PR',queries:['Escola Municipal de Artes Gasparzinho Palotina','Escola Gasparzinho Palotina']}
  ];
  const container=document.querySelector('#culture-map'), status=document.querySelector('#map-status');
  if(!window.L) { status.textContent='Não foi possível carregar o mapa. Consulte os endereços nos cartões acima.';return; }
  const map=L.map(container,{scrollWheelZoom:false}).setView([-24.283,-53.84],14);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Busca: <a href="https://photon.komoot.io/">Photon</a>'}).addTo(map);
  const markers=[];
  let tileWarning=false;
  tiles.on('tileerror',()=>{if(!tileWarning){tileWarning=true;status.textContent='O fundo do mapa está indisponível. Os endereços continuam nos cartões acima.';}});
  function fit(){if(markers.length)map.fitBounds(L.featureGroup(markers).getBounds().pad(.2),{maxZoom:16});}
  document.querySelector('#map-reset').addEventListener('click',fit);
  const buttons=places.map((place,index)=>{
    const button=document.createElement('button');button.type='button';button.textContent=`${index+1}. ${place.name}`;button.disabled=true;
    document.querySelector('#map-locations').append(button);return button;
  });
  async function locate(place){
    // Fixed points supplied by the institution take priority over search and old cache.
    if(valid(place.point)) return {point:place.point,approximate:false};
    const cacheKey=`cultura-map-v2-${place.id}-${encodeURIComponent(place.address)}`;
    try {const saved=JSON.parse(localStorage.getItem(cacheKey));if(saved && Date.now()-saved.time<7*86400000 && valid(saved.point))return saved;}catch{}
    for(const query of place.queries){
      try {
        const url=new URL('https://photon.komoot.io/api/');url.search=new URLSearchParams({q:query,limit:'5',lat:'-24.283',lon:'-53.84'}).toString();
        const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)continue;
        const data=await response.json();
        const candidates=(Array.isArray(data.features)?data.features:[]).filter(item=>valid(item.geometry?.coordinates));
        const matchesAddress = item => {
          if(place.id === 'gasparzinho') return String(item.properties?.name || '').toLowerCase().includes('gasparzinho');
          if(place.id !== 'departamento') return true;
          const street = String(item.properties?.street || item.properties?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
          const house = item.properties?.housenumber;
          return street.includes('gaspar') && street.includes('dutra') && (!house || String(house) === '706');
        };
        const result=candidates.filter(matchesAddress).sort((a,b)=>Number(Boolean(b.properties?.housenumber))-Number(Boolean(a.properties?.housenumber)))[0];
        if(result){const info={point:result.geometry.coordinates,approximate:!result.properties?.housenumber && (place.id==='departamento'||result.properties?.type==='street'||result.properties?.osm_value==='residential'),time:Date.now()};try{localStorage.setItem(cacheKey,JSON.stringify(info));}catch{}return info;}
      }catch{}
    }
    return null;
  }
  function valid(point){return Array.isArray(point)&&point.length===2&&Number.isFinite(point[0])&&Number.isFinite(point[1])&&point[0]>-53.91&&point[0]<-53.77&&point[1]>-24.34&&point[1]<-24.22;}
  async function load(){
    await Promise.all(places.map(async (place,index)=>{
      const result=await locate(place);
      if(!result)return;
      const popup=document.createElement('div'),title=document.createElement('strong'),address=document.createElement('p'),link=document.createElement('a');
      title.textContent=place.name;address.textContent=place.address+' — Palotina, PR'+(result.approximate?' (ponto aproximado)':'');
      const url=new URL('https://www.google.com/maps/search/');url.search=new URLSearchParams({api:'1',query:valid(place.point)?`${place.point[1]},${place.point[0]}`:place.name+' '+place.address+' Palotina PR'}).toString();link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Como chegar ↗';popup.append(title,address,link);
      const marker=L.marker([result.point[1],result.point[0]],{title:place.name,alt:place.name}).addTo(map).bindPopup(popup);markers.push(marker);
      buttons[index].disabled=false;buttons[index].addEventListener('click',()=>{map.setView(marker.getLatLng(),16);marker.openPopup();});
      fit();
    }));
    fit();
    if(!tileWarning)status.textContent=markers.length===places.length?`${places.length} espaços culturais no mapa. Toque em um marcador para conhecer o local.`:`Foi possível localizar ${markers.length} de ${places.length} espaços. Consulte também as informações nos cartões acima.`;
  }
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();map.invalidateSize();load();}},{rootMargin:'200px'});observer.observe(container);
})();
