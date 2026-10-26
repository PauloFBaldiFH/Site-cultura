#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" != '--apply' ]]; then
  cat <<'TEXT'
Ativação da publicação automática futura:
  sudo bash automation/enable-autopublish.sh --apply
Opcional: --replace-token para substituir a credencial existente.
Cria checkout separado em /var/lib/cultura-importer/automatic-site, preservando
rascunhos e alterações locais do checkout anterior. Pede o token sem eco,
guarda-o em /etc/cultura-importer/github-token (root, 0600), e usa LoadCredential.
Reutiliza os limites de CPU/memória e o timer existente; não abre portas,
não altera Koha, não força pushes e não inicia uma coleta durante a instalação.
TEXT
  exit 0
fi
[[ $EUID -eq 0 ]] || { echo 'Execute com sudo.' >&2; exit 1; }
[[ -x /opt/cultura-node/current/bin/node ]] || { echo 'Runtime privado não instalado.' >&2; exit 1; }
id cultura-importer >/dev/null
[[ -d /var/lib/cultura-importer/site/automation/state ]] || { echo 'Estado original não encontrado; nada foi alterado.' >&2; exit 1; }
for command in git systemctl systemd-analyze runuser; do command -v "$command" >/dev/null; done
cultura_checkout=/var/lib/cultura-importer/automatic-site
if [[ ! -e "$cultura_checkout" ]]; then
  runuser -u cultura-importer -- git clone --depth 1 https://github.com/PauloFBaldiFH/Site-cultura.git "$cultura_checkout"
else
  [[ "$(runuser -u cultura-importer -- git -C "$cultura_checkout" remote get-url origin)" == 'https://github.com/PauloFBaldiFH/Site-cultura.git' ]] || exit 1
  [[ -z "$(runuser -u cultura-importer -- git -C "$cultura_checkout" status --porcelain)" ]] || { echo 'Checkout automático tem mudanças locais; preserve antes de atualizar.' >&2; exit 1; }
  runuser -u cultura-importer -- git -C "$cultura_checkout" fetch origin main
  runuser -u cultura-importer -- git -C "$cultura_checkout" merge --ff-only FETCH_HEAD
fi
[[ -f "$cultura_checkout/automation/lib/automatic.mjs" ]] || { echo 'Mescle o PR de publicação automática antes de ativar.' >&2; exit 1; }
[[ -f "$cultura_checkout/automation/systemd/cultura-autopublish.service" ]] || exit 1
systemd-analyze verify "$cultura_checkout/automation/systemd/cultura-autopublish.service"
install -d -m 0700 -o root -g root /etc/cultura-importer
if [[ ! -f /etc/cultura-importer/github-token || "${2:-}" == '--replace-token' ]]; then
  read -r -s -p 'Token GitHub (somente Site-cultura, Contents: Read and write): ' cultura_token </dev/tty
  printf '\n' >/dev/tty
  [[ "$cultura_token" =~ ^[A-Za-z0-9_-]{20,300}$ ]] || { echo 'Formato de token inválido.' >&2; exit 1; }
  (umask 077; printf '%s' "$cultura_token" > /etc/cultura-importer/github-token.tmp)
  mv /etc/cultura-importer/github-token.tmp /etc/cultura-importer/github-token
  unset cultura_token
fi
[[ ! -L /etc/cultura-importer/github-token ]] || { echo 'Arquivo de credencial não pode ser link simbólico.' >&2; exit 1; }
chown root:root /etc/cultura-importer/github-token
chmod 0600 /etc/cultura-importer/github-token
cultura_timer_active=false
if systemctl is-active --quiet cultura-importer.timer; then cultura_timer_active=true; fi
cultura_backup="$(mktemp /tmp/cultura-unit.XXXXXXXX)"
cp /etc/systemd/system/cultura-importer.service "$cultura_backup"
cultura_success=false
finish(){
  if [[ "$cultura_success" != true ]]; then cp "$cultura_backup" /etc/systemd/system/cultura-importer.service; systemctl daemon-reload; fi
  if [[ "$cultura_timer_active" == true ]]; then systemctl start cultura-importer.timer; fi
  rm -f "$cultura_backup"
}
trap finish EXIT
systemctl stop cultura-importer.timer
if systemctl is-active --quiet cultura-importer.service; then echo 'Há uma coleta em execução. Aguarde e tente novamente; ela não foi interrompida.' >&2; exit 1; fi
[[ ! -d /var/lib/cultura-importer/site/automation/state/lock ]] || { echo 'Existe um lock de execução. Verifique processos e documentação antes de removê-lo.' >&2; exit 1; }
if [[ ! -f /etc/systemd/system/cultura-importer.service.before-auto ]]; then
  cp "$cultura_backup" /etc/systemd/system/cultura-importer.service.before-auto
fi
install -m 0644 "$cultura_checkout/automation/systemd/cultura-autopublish.service" /etc/systemd/system/cultura-importer.service
systemctl daemon-reload
cultura_success=true
echo 'Modo automático registrado. O estado anterior do timer será preservado.'
echo 'Para a primeira execução, que registra os posts existentes como referência:'
echo 'sudo systemctl start cultura-importer.service'
echo 'sudo journalctl -u cultura-importer.service -n 40 --no-pager'
echo 'A ativação real só estará confirmada após sucesso dessa execução e acesso ao GitHub.'
