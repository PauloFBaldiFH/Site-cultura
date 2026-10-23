(() => {
  const config = window.CULTURA_CALENDAR || {};
  const calendarId = typeof config.googleCalendarId === 'string' ? config.googleCalendarId.trim() : '';
  if (!calendarId) return;

  const embed = new URL('https://calendar.google.com/calendar/embed');
  embed.search = new URLSearchParams({
    src: calendarId,
    ctz: config.timeZone || 'America/Sao_Paulo',
    hl: 'pt_BR',
    mode: 'AGENDA',
    showTitle: '0',
    showPrint: '0',
    showTabs: '1',
    showCalendars: '0',
    showTz: '1'
  }).toString();
  document.querySelector('#events-calendar').src = embed.href;

  const link = new URL('https://calendar.google.com/calendar/u/0/r');
  link.searchParams.set('cid', calendarId);
  document.querySelector('#calendar-link').href = link.href;
  document.querySelector('#calendar-placeholder').hidden = true;
  document.querySelector('#calendar-content').hidden = false;
})();
