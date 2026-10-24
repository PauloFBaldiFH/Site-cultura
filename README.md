# Cultura Palotina

Site responsivo do Departamento de Cultura de Palotina, em HTML, CSS e JavaScript, sem dependências de compilação.

## Desenvolvimento

Na pasta `/workspace/Site-cultura`, execute:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

O conteúdo é estático. Publique `index.html`, `style.css`, `app.js`, `calendar.js`, `calendar-config.js`, `map.js` e as pastas `assets`, `vendor` e `oficinas` em uma hospedagem estática com HTTPS.

## Conteúdo

As 27 oficinas foram transcritas do quadro fornecido e a Banda Sinfônica foi adicionada posteriormente, totalizando 28. A busca ignora acentos e pode ser combinada com os filtros. Os cartões levam às páginas individuais das oficinas. Não há formulário de inscrição nem coleta de dados.

Endereço, telefone e atendimento foram extraídos das imagens fornecidas. Vagas e períodos de inscrição precisam ser confirmados com o departamento. As categorias das oficinas são uma organização editorial para navegação, não uma classificação oficial.

A fonte online é opcional: fontes locais substitutas são usadas quando o Google Fonts não estiver disponível. O arquivo `assets/nova logo da cultura.png` é usado como marca e favicon na página principal e nas páginas das oficinas, sem alterações na imagem original.

## Páginas das oficinas

Cada oficina possui um cartão com imagem temática da coleção `assets/oficinas-ilustradas.png` e uma página HTML independente em `oficinas/`. Edite essas páginas para acrescentar conteúdo; elas já usam a identidade do site e têm links de retorno e contato. As ilustrações temáticas foram geradas em uma coleção de 28 cenas, organizada em quatro colunas e sete linhas em `assets/oficinas-ilustradas.png`. O CSS seleciona a cena de cada oficina, sem emojis nem dependência de fontes de símbolos. Mantenha os cartões atualizados pelo cadastro no início de `app.js`.

As oficinas são apresentadas apenas em cartões, com busca e filtros. A lista alternativa, o quadro original e o aviso de inscrições foram removidos.

## Mapa dos espaços culturais

Há um único mapa Leaflet/OpenStreetMap abaixo dos quatro cartões, com marcadores, popups, seleção por instituição e botão para enquadrar todos os pontos. A biblioteca Leaflet 1.9.4 e sua licença estão em `vendor/leaflet`, obtidas do pacote oficial npm.

As coordenadas são buscadas pelo nome e endereço no Photon ao aproximar o mapa da tela e guardadas no navegador por sete dias. Resultados fora de Palotina são rejeitados. Resultados que identificam apenas uma rua são indicados como aproximados. Confira os pontos no site publicado; a rede do ambiente bloqueou o Photon e a validação de marcadores foi feita com respostas simuladas. Falhas de busca e de mapa são informadas sem inventar pontos. Os serviços externos exigem acesso à internet: `photon.komoot.io` e `tile.openstreetmap.org`.

## Calendário de eventos

O ícone de calendário no cabeçalho abre uma janela com calendário mensal pronto para uso, sem exigir conta Google ou redirecionar ao WhatsApp. É possível navegar entre meses, voltar para hoje e selecionar um dia. Dias sem eventos mostram “Nenhum evento cadastrado para este dia”. Escape ou o botão de fechar retorna ao site.

Para cadastrar eventos, edite a lista `events` de `calendar-config.js` e publique o arquivo:

```js
{ date: '2026-12-10', title: 'Nome do evento', time: '19h', location: 'Teatro Municipal' }
```

Use apenas eventos públicos confirmados. O exemplo é ilustrativo e não está cadastrado na programação. O fuso para identificar o dia atual é `America/Sao_Paulo`.

Opcionalmente, uma agenda Google pode substituir a visualização local: torne uma agenda exclusiva de eventos públicos visível ao público, copie seu ID em **Configurações → Integrar agenda** e preencha `googleCalendarId`. O iframe só carrega ao abrir o calendário. Verifique em janela anônima se os eventos aparecem sem login. Não use uma agenda pessoal privada. Nenhuma chave de API ou backend é necessário.

## Escola Municipal de Artes Gasparzinho

Quinta instituição na seção de espaços culturais, com a imagem `assets/desenho escola gasparzinho.jpg`. Endereço, horário e contatos próprios não foram fornecidos; o cartão orienta consultar o Departamento de Cultura. O mapa busca a instituição pelo nome e só aceita resultados identificados como Gasparzinho, sem inventar endereço ou coordenadas.

As instituições são exibidas em uma única coluna, com cartões horizontais (imagem à esquerda e informações à direita) no desktop. No celular, a imagem fica acima do texto.

O Departamento de Cultura usa o ponto fixo confirmado pelo usuário: latitude **-24.289374**, longitude **-53.840933**. Esse ponto tem prioridade sobre qualquer cache ou busca por endereço. Os links “Como chegar” do cartão e do popup também usam essas coordenadas. Os demais locais continuam com a busca existente.
