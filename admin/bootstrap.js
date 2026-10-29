(async () => {
  const status = document.querySelector('#cms-status');
  try {
    const [configResponse, settingsResponse] = await Promise.all([fetch('config.yml'), fetch('settings.json')]);
    if (!configResponse.ok || !settingsResponse.ok) throw Error('Não foi possível carregar a configuração.');
    // config.yml usa JSON, um subconjunto válido de YAML.
    const config = await configResponse.json();
    const settings = await settingsResponse.json();
    const local = ['localhost', '127.0.0.1'].includes(location.hostname);
    if (!settings.oauthBaseUrl && !local) {
      status.replaceChildren();
      const heading = document.createElement('h1'); heading.textContent = 'Editor instalado — falta conectar o login';
      const p = document.createElement('p'); p.textContent = 'O responsável pelo site precisa configurar a autenticação do GitHub. Depois, os colaboradores autorizados poderão entrar com suas próprias contas.';
      const a = document.createElement('a'); a.href = 'https://github.com/PauloFBaldiFH/Site-cultura/blob/main/admin/README.md'; a.textContent = 'Ver instruções de ativação';
      status.append(heading, p, a); return;
    }
    if (local) config.local_backend = true;
    else {
      const url = new URL(settings.oauthBaseUrl);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('Endereço de autenticação inválido.');
      config.backend.base_url = url.origin;
    }
    if (!window.CMS) throw Error('O editor não carregou. Verifique a conexão e tente novamente.');
    config.load_config_file = false;
    config.backend.commit_messages = { create: 'Cria {{collection}}: {{slug}}', update: 'Atualiza {{collection}}: {{slug}}', uploadMedia: 'Adiciona imagem {{path}}' };
    status.hidden = true;
    window.CMS.init({ config });
  } catch (error) {
    status.hidden = false;
    status.textContent = error.message;
  }
})();
