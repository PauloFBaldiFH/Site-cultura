# Importação assistida do Instagram

O portal continua no GitHub Pages. Um coletor HTTP em Node.js 22+ roda separadamente, sem servidor web, sem porta de entrada, sem Playwright/Chromium e sem dependências npm. Não exige chave Meta, senha ou cookies de sessão.

**Limitação real:** o Instagram pode não fornecer legendas no HTML público, exigir login ou bloquear a coleta. Isso não é uma integração oficial garantida. O coletor tenta extrair JSON público ou metadados de posts; falha explicitamente se não conseguir. Não tenta contornar login, CAPTCHA ou bloqueios. Há também importação por JSON para quando a coleta não funcionar. Datas de publicação não viram datas de evento automaticamente.

## Fluxo

1. `collect` busca até seis publicações públicas de `@cultura_palotina` e sugere categorias por palavras-chave.
2. Rascunhos e miniaturas ficam somente em `automation/state/`, ignorada pelo Git.
3. Uma pessoa revisa legenda, imagem, categorias e, se houver, data do evento.
4. `approve` salva a publicação revisada em `data/publicacoes.json` e gera HTML estático nas páginas correspondentes. Não envia nada ao GitHub.
5. Revise `git diff`, crie uma branch e envie um PR com a conta que já usa para publicar. Só depois da mesclagem o conteúdo aparece no site público.

Não configure push automático com credenciais pessoais no servidor do Koha. O coletor agendado não tem credenciais GitHub e não modifica os arquivos públicos. Não use a tarefa de coleta para aprovar conteúdo automaticamente.

## Categorias e páginas

`config.json` contém as 28 oficinas, cinco espaços e os eventos FEMUSE, Canta Palotina e Domingueira. O classificador ignora acentos, reconhece frases e algumas hashtags, e evita correspondências dentro de outras palavras. Uma publicação pode ter várias sugestões. Regras são sugestões, não interpretação infalível: termos genéricos ou anúncios de vários eventos precisam de revisão.

- `oficina:violino` → página da oficina de violino.
- `espaco:biblioteca` → seção da Biblioteca no portal.
- `evento:femuse` → página do FEMUSE.
- `noticia:geral` → notícia sem oficina/espaço/evento específico, exibida no bloco geral do portal.

As páginas de eventos são geradas de `config.json`; edite o nome, a descrição e as palavras-chave ali, não nos arquivos gerados em `eventos/`. Para novos eventos, use IDs minúsculos com letras, números e hífen. Rode `build` depois da edição. Sem publicações aprovadas, as páginas informam que a programação será acrescentada quando confirmada; não há datas nem vagas inventadas.

## Uso no ambiente de desenvolvimento

Na raiz do checkout:

```sh
node --version
node --test --test-concurrency=1 automation/tests/*.test.mjs
node automation/cli.mjs collect
node automation/cli.mjs list
```

O comando `collect` pode falhar por bloqueio do Instagram; isso não apaga notícias aprovadas. Confira os logs antes de considerar a coleta ativa.

Importação alternativa, com conteúdo que você tem acesso e autorização para publicar:

```json
[
  {
    "url": "https://www.instagram.com/p/CODIGO_REAL_DO_POST/",
    "text": "Legenda completa revisável da publicação.",
    "publishedAt": "2026-10-26T12:00:00-03:00"
  }
]
```

Salve esse conteúdo em um arquivo local (por exemplo, `automation/state/entrada.json`) e use `node automation/cli.mjs import automation/state/entrada.json`. O código no link deve ser o verdadeiro. A data de publicação é opcional. Uma propriedade opcional `imageUrl` permite buscar uma miniatura apenas em hosts `cdninstagram.com` ou `fbcdn.net`; redirecionamentos são validados, e o arquivo precisa ser JPEG, PNG ou WebP até 1,5 MiB. Se a imagem falhar, o rascunho é preservado com um aviso. URLs de mídia não são publicadas, para evitar depender de links temporários do Instagram.

Depois de `list`, use o ID real mostrado. Exemplo de formato (substitua `ig-ID_REAL` pelo ID da lista):

```sh
node automation/cli.mjs approve ig-ID_REAL --title "Título revisado" --tags "oficina:violino,evento:femuse"
```

Para ajustar a legenda, acrescente `--text-file CAMINHO_DO_TEXTO.txt`. Para rejeitar, use `node automation/cli.mjs reject ig-ID_REAL`.

Somente quando a data de um evento estiver confirmada, acrescente à aprovação:

```text
--event-date AAAA-MM-DD --event-time "19h" --venue "Teatro Municipal Ludovico Riedi"
```

Isso gera uma entrada para o calendário local em `eventos/calendar-data.js`, sem alterar os eventos manuais de `calendar-config.js`. O calendário Google, se futuramente configurado para substituir o local, continua sendo atualizado no Google; o coletor não escreve na conta Google.

Publicações editadas no Instagram voltam como rascunho se a legenda mudou. Aprovar substitui a versão com o mesmo ID. Rejeições não são reimportadas enquanto a legenda permanecer igual. `build` recria apenas os blocos demarcados, páginas geradas de eventos, dados de calendário e sitemap; revise o diff antes de publicar. Ele não faz push, merge ou deploy. Atualize a lógica do sitemap se acrescentar outras páginas fora dessas categorias.

## Instalação isolada na VPS de produção

**Não foi implantado nem testado no seu servidor.** Os limites abaixo reduzem risco, mas nenhum processo extra tem impacto zero. Como o Koha é produção, só habilite a agenda depois de testar uma execução manual pelo systemd e conferir recursos. Não instale navegador automatizado, banco, Docker nem pacotes Node globais para esse coletor.

1. Mescle o PR no GitHub. No terminal Ubuntu, confira os recursos e se existe Node 22+ em `/usr/bin/node`:

   ```sh
   free -h
   df -h /var/lib
   /usr/bin/node --version
   command -v git
   systemctl --version
   ```

   Se Node não existir ou for antigo, pare aqui: não substitua um runtime compartilhado em produção. Podemos avaliar uma instalação isolada numa etapa separada.

2. Em um diretório de trabalho fora das pastas do Koha, clone o repositório. Não use um checkout com alterações locais:

   ```sh
   git clone https://github.com/PauloFBaldiFH/Site-cultura.git cultura-coletor-instalacao
   cd cultura-coletor-instalacao
   bash automation/install-vps.sh
   ```

   Esse último comando só mostra o plano. Após conferir o script, execute:

   ```sh
   sudo bash automation/install-vps.sh --apply
   ```

   Ele cria o usuário sem login `cultura-importer`, clona para `/var/lib/cultura-importer/site` e registra unidades separadas. Não reinicia Koha, MySQL, Nginx ou túnel; não altera DNS/firewall; não abre porta; não habilita o timer. Não atualiza um checkout existente automaticamente nem sobrescreve unidades diferentes.

3. Faça uma execução manual **pela unidade**, para aplicar os limites de recurso:

   ```sh
   sudo systemctl start cultura-importer.service
   sudo journalctl -u cultura-importer.service -n 40 --no-pager
   sudo systemctl show cultura-importer.service -p Result -p MemoryPeak -p CPUUsageNSec
   ```

   Limites: 10% de um núcleo de CPU, memória máxima 192 MiB (128 MiB de limiar), sem swap, até 20 tarefas, baixa prioridade de CPU/IO, prazo de quatro minutos, uma execução de cada vez. No máximo seis posts, consultas sequenciais e respostas limitadas. Sem porta, sessão de usuário ou acesso às pastas do Koha/MySQL. Não execute `collect` diretamente na VPS se quiser manter esses limites.

4. Se a execução funcionou e a carga está aceitável, habilite a coleta diária fora do atendimento:

   ```sh
   sudo systemctl enable --now cultura-importer.timer
   systemctl list-timers cultura-importer.timer
   ```

   Executa entre 03h15 e 04h no fuso `America/Sao_Paulo`. Não repõe execuções perdidas durante o boot. Não há reinício automático em caso de falha.

5. Para listar rascunhos sem acessar painel nem abrir porta:

   ```sh
   sudo -u cultura-importer /usr/bin/node /var/lib/cultura-importer/site/automation/cli.mjs list
   ```

   Copie `automation/state/drafts.json` e `automation/state/media/` para seu ambiente de desenvolvimento se quiser revisar/publicar de lá. Esses arquivos podem conter conteúdo ainda não aprovado: não exponha a pasta como site público. A aprovação e o PR podem ser feitos no ambiente em que você já tem acesso ao GitHub.

### Desativar imediatamente

```sh
sudo systemctl disable --now cultura-importer.timer
sudo systemctl stop cultura-importer.service
```

Isso não para nenhum serviço do Koha. Não remova a pasta de rascunhos sem preservar o que precisar.

Se uma execução for interrompida à força e deixar `automation/state/lock`, verifique que o serviço está parado e não existe outro processo coletor antes de remover apenas esse diretório vazio (`sudo rmdir /var/lib/cultura-importer/site/automation/state/lock`). Não remova o arquivo de estado nem execute instâncias concorrentes.

## Evidência desta implementação

Os testes automatizados verificam classificação, parsing de HTML público de exemplo, bloqueios de rede, importação/revisão/publicação, escape de HTML, calendário e repetição sem duplicatas. O diretório de eventos e o calendário foram exercitados no Chromium. A tentativa de acesso real ao Instagram neste ambiente foi bloqueada pelo proxy (403), então **a coleta real ainda não foi demonstrada**. A VPS não foi acessada nem modificada.

As instituições mostram até duas publicações recentes cada; oficinas, até seis; o portal, até seis; páginas de evento, até trinta. O arquivo de dados mantém as demais publicações aprovadas. A coleta de até seis posts por execução não é um espelho completo do histórico do Instagram. Se o Instagram não fornecer HTML público utilizável na VPS, desative o timer e use a importação manual, ou avalie a API oficial/serviço autorizado em uma etapa separada.
