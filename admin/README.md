# Editor da Cultura — Decap CMS

Após publicar, o painel fica em **https://cultura.palotina.org/admin/**. A instalação no repositório não cria contas nem ativa um serviço OAuth automaticamente. Sem configurar o login, o painel mostra uma explicação e não tenta uma autenticação inexistente.

## O que se pode editar

- Título e apresentação da página inicial.
- Nome, apresentação, edição, texto e fotos adicionais de cada evento; o botão “Mostrar nos cards” controla a divulgação nos cards.
- Nome, apresentação, endereço e atendimento dos cinco espaços.
- Parágrafos das 28 páginas de oficinas.

Os campos são formulários de conteúdo, não um editor livre de HTML ou do desenho da página. Parágrafos são texto; uma linha em branco separa parágrafos. HTML digitado é exibido como texto. As galerias existentes são preservadas, e fotos adicionais podem ser enviadas pelo painel (até 5 MB por arquivo). Use nomes de arquivos sem acentos. O mapa continua em `map.js`: alterar o endereço textual não move automaticamente a marcação. Não exponha dados privados nem envie imagens sem a autorização necessária.

O conteúdo fica em `data/content.json`; imagens novas em `assets/uploads/`. Os identificadores e URLs existentes são fixos nesta primeira versão. Acrescentar uma nova oficina ou um novo tipo de evento exige adaptar a configuração do site.

## 1. Ativar a publicação

No repositório GitHub, abra **Settings → Pages → Build and deployment → Source → GitHub Actions**. Preserve o domínio personalizado `cultura.palotina.org` e o HTTPS.

O workflow `.github/workflows/site.yml` testa e gera as páginas, prepara `_site/` e publica o resultado. Faça merge desta mudança e confira **Actions → Validar e publicar Cultura**. Se necessário, use **Run workflow**. Nenhuma instalação na VPS do Koha é necessária.

As alterações no editor criam rascunhos em branches/PRs pelo fluxo editorial do Decap. Somente ao publicar/mesclar em `main` o site público é atualizado. Autorize apenas colaboradores que devem poder modificar o site.

## 2. Ativar o login sem usar o servidor do Koha

O backend GitHub do Decap precisa de um intermediário OAuth para manter o Client Secret fora do navegador. Incluímos um **Cloudflare Worker** independente em `automation/oauth/`. Não usa o túnel do Koha, porta da VPS, banco de dados ou API do Instagram.

1. No Cloudflare, crie um Worker com o nome `cultura-cms-auth` (ou use Wrangler no seu computador). Copie o código de `automation/oauth/worker.mjs` e publique. Anote o endereço HTTPS `workers.dev` exibido pelo Cloudflare.
2. No GitHub, abra **Settings da sua conta → Developer settings → OAuth Apps → New OAuth App** (https://github.com/settings/applications/new).
3. Nome: **Editor Cultura Palotina**. Homepage URL: `https://cultura.palotina.org/admin/`. Authorization callback URL: o endereço do Worker seguido de `/callback`.
4. Crie o aplicativo e gere o **Client Secret**. No Worker, em **Settings → Variables and Secrets**, adicione como **Secrets**: `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET`. Publique a configuração. Nunca coloque o secret no repositório ou no chat.
5. Edite `admin/settings.json`: preencha `oauthBaseUrl` com o endereço HTTPS completo do Worker, sem `/auth` ou `/callback`. Faça commit. O ID do app e o secret não entram nesse arquivo.
6. Acesse `/admin/` e entre pelo GitHub. A conta precisa ter permissão de escrita no repositório. Convide pessoas em **Settings do repositório → Collaborators**.

O escopo OAuth `public_repo` é o escopo clássico necessário ao backend GitHub para editar repositórios públicos; **não é um token restrito apenas a este repositório**. O serviço só conclui o login para usuários com escrita em `PauloFBaldiFH/Site-cultura`. Se os colaboradores não quiserem autorizar esse escopo, é preciso escolher outro backend/provedor. Não compartilhe contas ou tokens. Revogação em GitHub → Settings → Applications → Authorized OAuth Apps.

O Worker valida o estado de login por cookie HttpOnly, exige permissão de escrita, e entrega a resposta somente à origem `https://cultura.palotina.org`. Domínios de preview não são aceitos. O fluxo foi testado com respostas simuladas; a autorização real só pode ser testada após cadastrar o aplicativo.

### Alternativa por terminal (no computador de administração)

Com Node instalado, use `npx wrangler@4 deploy` dentro de `automation/oauth/`, depois `npx wrangler@4 secret put GITHUB_CLIENT_ID` e `npx wrangler@4 secret put GITHUB_CLIENT_SECRET`. Os comandos pedem os valores de forma interativa. Não execute no servidor de produção apenas para instalar o editor.

## Teste local sem OAuth

Sirva a pasta do projeto com um servidor HTTP em `localhost`. Em outro terminal, na raiz do projeto, execute `npx decap-server`. Abra `/admin/` no servidor local. O bootstrap habilita `local_backend` apenas em localhost/127.0.0.1. O proxy local altera arquivos no computador, não publica no GitHub; use somente em máquina de desenvolvimento.

## Importador de Instagram

O gerador incorpora `data/content.json` e não modifica esse arquivo. O publicador automático também lê o conteúdo editorial do snapshot atual. Após atualizar o código no GitHub, atualize a instalação do importador pelos procedimentos de `automation/AUTOMATIC.md` para carregar os novos módulos. Até isso ocorrer, o workflow do Pages continua aplicando o conteúdo editorial em cada publicação em `main`.

## Conferência e recuperação

- `node --test --test-concurrency=1 automation/tests/*.test.mjs`
- `node automation/cli.mjs build`
- `node automation/export-site.mjs`

Antes da primeira publicação, teste um rascunho, salve, publique e confira o resultado. O histórico do GitHub permite reverter alterações. Para desativar só o painel, remova a pasta `admin/` e revogue o OAuth App; o site público pode continuar funcionando.
