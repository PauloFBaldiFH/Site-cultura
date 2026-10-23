(() => {
  const config = window.CULTURA_CALENDAR || {};
  const timeZone = config.timeZone || 'America/Sao_Paulo';
  const todayParts = new Intl.DateTimeFormat('en-CA', {timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part = name => todayParts.find(item => item.type === name).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  let selected = today;
  let shown = new Date(Number(part('year')),Number(part('month')) - 1,1);
  const events = Array.isArray(config.events) ? config.events.filter(event => event && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && typeof event.title === 'string') : [];
  const dialog = document.querySelector('#calendar-dialog');
  const calendarId = typeof config.googleCalendarId === 'string' ? config.googleCalendarId.trim() : '';
  function dateKey(day) { return `${shown.getFullYear()}-${String(shown.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; }
  function showEvents() {
    const date = new Date(`${selected}T12:00:00`);
    document.querySelector('#selected-date').textContent = new Intl.DateTimeFormat('pt-BR',{dateStyle:'full'}).format(date);
    const container = document.querySelector('#day-events'); container.replaceChildren();
    const daily = events.filter(event => event.date === selected);
    if (!daily.length) { const text = document.createElement('p'); text.textContent = 'Nenhum evento cadastrado para este dia.'; container.append(text); return; }
    daily.forEach(event => {
      const article = document.createElement('article'), title = document.createElement('h4'), detail = document.createElement('p');
      title.textContent = event.title;
      detail.textContent = [event.time,event.location].filter(value => typeof value === 'string' && value).join(' · ');
      article.append(title,detail); container.append(article);
    });
  }
  function render() {
    document.querySelector('#calendar-month').textContent = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(shown);
    const tbody = document.querySelector('#calendar-days'); tbody.replaceChildren();
    const count = new Date(shown.getFullYear(),shown.getMonth()+1,0).getDate(), offset = shown.getDay();
    for (let i=0;i<Math.ceil((offset+count)/7)*7;i+=7) {
      const row=document.createElement('tr');
      for(let col=0;col<7;col++) {
        const cell=document.createElement('td'), day=i+col-offset+1;
        if(day>0 && day<=count) {
          const key=dateKey(day), button=document.createElement('button'); button.type='button'; button.textContent=day;
          const total=events.filter(event=>event.date===key).length;
          button.setAttribute('aria-label',`${day} de ${new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(shown)}${total ? `, ${total} evento(s)` : ''}`);
          button.setAttribute('aria-pressed',String(key===selected));
          if(key===today) button.setAttribute('aria-current','date');
          if(total) button.classList.add('has-events');
          button.addEventListener('click',()=>{selected=key;render();tbody.querySelector(`[data-date="${key}"]`).focus();});
          button.dataset.date=key;cell.append(button);
        }
        row.append(cell);
      }
      tbody.append(row);
    }
    showEvents();
  }
  document.querySelector('#previous-month').addEventListener('click',()=>{shown=new Date(shown.getFullYear(),shown.getMonth()-1,1);selected=dateKey(1);render();});
  document.querySelector('#next-month').addEventListener('click',()=>{shown=new Date(shown.getFullYear(),shown.getMonth()+1,1);selected=dateKey(1);render();});
  document.querySelector('#calendar-today').addEventListener('click',()=>{selected=today;shown=new Date(Number(part('year')),Number(part('month'))-1,1);render();});
  document.querySelector('#calendar-trigger').addEventListener('click',()=>{
    if(calendarId && !document.querySelector('#events-calendar').src) {
      const embed=new URL('https://calendar.google.com/calendar/embed');embed.search=new URLSearchParams({src:calendarId,ctz:timeZone,hl:'pt_BR',mode:'MONTH',showTitle:'0'}).toString();
      document.querySelector('#events-calendar').src=embed.href;
      document.querySelector('#calendar-link').href=embed.href;
    }
    dialog.showModal();
  });
  if(calendarId) { document.querySelector('#local-calendar').hidden=true;document.querySelector('#google-calendar-content').hidden=false; }
  render();
})();
