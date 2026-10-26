# Publicação automática de posts novos

Este modo foi solicitado pelo responsável pelo site: **não há aprovação por postagem**. O coletor mantém o limite de seis posts e a mesma execução diária; classifica os itens novos e grava um commit direto na `main`. O GitHub Pages publica após seu processamento normal.

A limitação do Instagram permanece: só é possível importar o conteúdo que o acesso público entregar. Não há promessa de encontrar todas as novas postagens. Não usa API ou credenciais do Instagram, não contorna login/CAPTCHA e não percorre o histórico inteiro.

## Comportamento

- A primeira execução com sucesso registra os IDs já existentes como referência e **não publica o histórico**.
- Depois disso, publica somente itens pendentes cujo ID ainda não existe no site nem nessa referência inicial; posts com data conhecida anterior à ativação ficam de fora.
- Sem data de origem, “novo” significa recém-descoberto pelo coletor; não há como provar que o post foi publicado recentemente. Por isso a referência inicial é importante.
- Reclassifica pela configuração mais recente do repositório. Sem correspondência, usa `noticia:geral`.
- Mantém a legenda integral, escapa HTML, usa a primeira linha como título e inclui a origem no Instagram. Não cria resumos por IA nem inventa informações.
- Datas de evento só entram no calendário se houver categoria de evento e uma indicação explícita como `Data: 10/12/2026` ou `Dia 2026-12-10`, sem datas conflitantes ou intervalo. Não deduz ano nem usa a data da postagem como data do evento.
- Itens rejeitados não são publicados automaticamente. Posts já públicos não são sobrescritos automaticamente quando a legenda muda.
- Lê a versão atual da `main` antes de montar as páginas. Envia apenas arquivos públicos de conteúdo, em um único commit, sem modificar código, workflows, configurações de servidor ou credenciais.
- A atualização não é forçada. Se alguém mudar a branch durante o processo, o envio falha preservando essa alteração e pode ser tentado de novo na execução seguinte.
- Falhas do Instagram ou GitHub deixam o site publicado intacto. As mídias válidas já coletadas são copiadas; se uma miniatura estiver indisponível, a publicação segue em texto.

## Credencial necessária (somente GitHub)

O servidor precisa de autorização para escrever no repositório. Isso é separado de uma chave da API do Instagram.

Na conta proprietária do repositório, abra **Settings → Developer settings → Personal access tokens → Fine-grained tokens**, ou:

https://github.com/settings/personal-access-tokens/new

Crie um token com:

- Resource owner: a conta que possui `PauloFBaldiFH/Site-cultura`.
- Repository access: **Only select repositories → Site-cultura**.
- Repository permissions: **Contents → Read and write**. Metadata de leitura pode ser incluída automaticamente pelo GitHub.
- Um prazo de expiração definido por você; ao vencer, a coleta falha sem apagar conteúdo, até renovar a credencial.

Não conceda acesso a todos os repositórios, administração, workflows ou segredos. Se regras da `main` impedirem commits diretos, a automação falhará; ela não altera nem contorna essas regras.

**Não cole o token no chat, em arquivos do repositório ou em comandos que o exponham no histórico.** O instalador pergunta pelo token sem mostrar o texto digitado e o armazena fora do checkout, em `/etc/cultura-importer/github-token`, root:root e 0600. O systemd entrega uma cópia privada somente ao processo do coletor por `LoadCredential`. O token não é configurado no Git nem colocado em URL ou variável de ambiente.

## Atualizar a VPS já instalada

Mescle primeiro o PR do modo automático. No terminal Ubuntu:

```sh
cd ~/cultura-instalacao-isolada
git pull --ff-only
sudo bash automation/enable-autopublish.sh --apply
```

O instalador cria um novo checkout em `/var/lib/cultura-importer/automatic-site`. **Não reseta nem apaga o checkout anterior com os dados aprovados**, e reutiliza os rascunhos em `/var/lib/cultura-importer/site/automation/state`.

Após pedir o token, atualiza somente `cultura-importer.service`. Preserva se o timer já estava ativo, não executa a coleta durante a instalação e não modifica Koha, MySQL, Nginx, túneis ou DNS. Mantém CPU máxima de 10% de um núcleo, memória máxima de 192 MiB, prazo de quatro minutos, baixa prioridade e nenhuma porta aberta. O serviço pode escrever apenas na pasta de estado; os arquivos gerados para o commit ficam temporariamente dentro dela.

Se houver uma coleta em execução, aguarda-se outra tentativa de ativação; o instalador não encerra o processo à força. Se ocorrer erro durante a troca da unidade, restaura o arquivo anterior e o estado ativo do timer.

Faça a execução inicial para registrar a referência:

```sh
sudo systemctl start cultura-importer.service
sudo journalctl -u cultura-importer.service -n 40 --no-pager
```

O resultado esperado é **“Referência inicial registrada. Os próximos posts novos serão publicados automaticamente.”** Isso confirma leitura do GitHub e a coleta; só a primeira publicação real confirmará a permissão de escrita. Nenhum post antigo é usado como teste de publicação.

Confirme o agendamento existente:

```sh
systemctl list-timers cultura-importer.timer
```

Se estiver desativado e quiser ativá-lo:

```sh
sudo systemctl enable --now cultura-importer.timer
```

As próximas execuções coletam e publicam sem pedir aprovação. Não é preciso mover o site do GitHub Pages para a VPS.

## Renovar, acompanhar e desfazer

Para trocar um token vencido, execute novamente:

```sh
sudo bash automation/enable-autopublish.sh --apply --replace-token
```

Execute a partir do checkout de instalação atualizado. O segredo não é exibido.

O histórico fica em `automation/state/automatic-history.json`, com os IDs e o commit GitHub de cada publicação. Nos logs aparece o SHA do commit. A automação guarda até 365 registros locais, enquanto o GitHub mantém o histórico de commits.

Para desfazer uma publicação, faça um `git revert` do commit indicado em uma branch de manutenção e publique por PR. Não use reset ou push forçado. Uma exclusão intencional no site não é automaticamente reposta por essa rotina, pois o item já foi marcado como publicado no estado local.

Para parar imediatamente novas execuções:

```sh
sudo systemctl disable --now cultura-importer.timer
sudo systemctl stop cultura-importer.service
```

Para voltar ao modo anterior, apenas rascunhos:

```sh
sudo systemctl stop cultura-importer.timer
sudo systemctl stop cultura-importer.service
sudo cp /etc/systemd/system/cultura-importer.service.before-auto /etc/systemd/system/cultura-importer.service
sudo systemctl daemon-reload
sudo systemctl start cultura-importer.timer
```

A restauração da unidade não desfaz posts já publicados. Os dados e o token são preservados; revogue o token no GitHub se não quiser mais usá-lo.

## Validação

Os testes locais usam a API GitHub simulada para verificar baseline, classificação, publicação, duplicatas, conteúdo escapado, preservação de edições existentes, falha de atualização e retomada. Nenhum commit automático real foi enviado por esses testes. A ativação na VPS depende do token inserido ali e da permissão de escrita na `main`; não foi feita nesta conversa.
