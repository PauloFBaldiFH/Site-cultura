// Calendário local pronto para receber eventos. Datas no formato AAAA-MM-DD.
// Exemplo: { date: '2026-12-10', title: 'Apresentação', time: '19h', location: 'Teatro Municipal' }
// Use apenas eventos públicos confirmados. Não inclua dados privados.
window.CULTURA_CALENDAR = {
  timeZone: 'America/Sao_Paulo',
  events: [],
  // Opcional: ao conectar uma agenda pública do Google, ela substitui a visualização local.
  googleCalendarId: ''
};
