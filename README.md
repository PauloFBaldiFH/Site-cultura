# Cultura Palotina

Site responsivo do Departamento de Cultura de Palotina, em HTML, CSS e JavaScript, sem dependências de compilação.

## Desenvolvimento

Na pasta `/workspace/Site-cultura`, execute:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

O conteúdo é estático. Publique `index.html`, `style.css`, `app.js` e a pasta `assets` em uma hospedagem estática com HTTPS.

## Conteúdo

As 27 oficinas foram transcritas do quadro fornecido e a Banda Sinfônica foi adicionada posteriormente, totalizando 28. A busca ignora acentos e pode ser combinada com os filtros. Os links de consulta abrem o WhatsApp com o nome da oficina. Não há formulário de inscrição nem coleta de dados.

Endereço, telefone e atendimento foram extraídos das imagens fornecidas. O comunicado de 02/02 não indica o ano; vagas e período atual precisam ser confirmados com o departamento. As categorias das oficinas são uma organização editorial para navegação, não uma classificação oficial.

A fonte online é opcional: fontes locais substitutas são usadas quando o Google Fonts não estiver disponível. O PNG fornecido é usado como marca e favicon, sem alterações.

## Páginas das oficinas

Cada oficina possui um cartão com imagem temática da coleção `assets/oficinas-ilustradas.png` e uma página HTML independente em `oficinas/`. Edite essas páginas para acrescentar conteúdo; elas já usam a identidade do site e têm links de retorno e contato. As ilustrações temáticas foram geradas em uma coleção de 28 cenas, organizada em quatro colunas e sete linhas em `assets/oficinas-ilustradas.png`. O CSS seleciona a cena de cada oficina, sem emojis nem dependência de fontes de símbolos. Mantenha a tabela e os cartões sincronizados pelo cadastro no início de `app.js`.

A tabela de oficinas é uma visualização alternativa, recolhida por padrão em “Ver oficinas em lista”. Busca e filtros atualizam os cartões e a tabela; a mensagem de nenhum resultado fica fora do bloco recolhido.

## Mapas interativos

Os quatro cartões de instituições incorporam mapas do Google com busca pelo nome e endereço, carregamento sob demanda, título acessível e botão externo “Como chegar”. Não é necessária chave de API para essa incorporação. A localização depende do resultado do Google para o endereço; confira os marcadores antes da divulgação. Os mapas precisam de conexão com o Google.

## Agenda de eventos (Google Calendar)

A integração está preparada, mas não está conectada a uma agenda real. Sem configuração, o site mostra a programação em preparação e um contato; não inventa eventos.

1. Crie ou escolha uma agenda exclusiva para eventos públicos da Cultura no Google Calendar.
2. Em **Configurações da agenda → Permissões de acesso a eventos**, disponibilize a agenda ao público com os detalhes que devem aparecer no site. Não use uma agenda pessoal com compromissos privados.
3. Em **Integrar agenda**, copie o **ID da agenda** (não um segredo ou chave de API).
4. Edite `calendar-config.js`, preencha `googleCalendarId` e publique o arquivo. O fuso padrão é `America/Sao_Paulo`.
5. Abra o site em uma janela anônima e confira se os eventos são visíveis sem login. As mudanças de programação são feitas no Google Calendar; não exigem editar o site.

O calendário é incorporado em modo agenda, com controles para outras visualizações e link para abrir no Google. Esta integração não exige backend nem chave de API. O OpenCalendar ou outro serviço pode ser integrado posteriormente conforme a plataforma escolhida e seu link público de incorporação.
