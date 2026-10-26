#!/usr/bin/env bash
set -euo pipefail
# No changes are made without --apply. Never installs/upgrades Node or restarts Koha.
if [[ "${1:-}" != "--apply" ]]; then
  cat <<'TEXT'
Instalação isolada do coletor (não hospeda site nem abre portas).
Requer /usr/bin/node 22+, git e systemd já instalados.
Com --apply: cria o usuário cultura-importer, clona o repositório em
/var/lib/cultura-importer/site e registra a unidade e o timer desativado.
Não instala dependências do sistema, não altera Koha/MySQL/Cloudflare/túneis.
Leia automation/README.md e execute após mesclar o PR:
  sudo bash automation/install-vps.sh --apply
TEXT
  exit 0
fi
[[ $EUID -eq 0 ]] || { echo 'Execute com sudo.' >&2; exit 1; }
[[ -x /usr/bin/node ]] || { echo '/usr/bin/node não encontrado. Não foi alterado.' >&2; exit 1; }
/usr/bin/node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)' || { echo 'Requer Node 22+. Não atualize o runtime do Koha por este script.' >&2; exit 1; }
command -v git >/dev/null
command -v systemctl >/dev/null
command -v systemd-analyze >/dev/null
if ! id cultura-importer >/dev/null 2>&1; then
  useradd --system --user-group --create-home --home-dir /var/lib/cultura-importer --shell /usr/sbin/nologin cultura-importer
fi
cultura_home="$(getent passwd cultura-importer | cut -d: -f6)"
[[ "$cultura_home" == '/var/lib/cultura-importer' ]] || { echo 'Usuário existente tem outro diretório. Nada será sobrescrito.' >&2; exit 1; }
cultura_checkout=/var/lib/cultura-importer/site
if [[ ! -e "$cultura_checkout" ]]; then
  runuser -u cultura-importer -- git clone --depth 1 https://github.com/PauloFBaldiFH/Site-cultura.git "$cultura_checkout"
fi
[[ "$(runuser -u cultura-importer -- git -C "$cultura_checkout" remote get-url origin)" == 'https://github.com/PauloFBaldiFH/Site-cultura.git' ]] || { echo 'Checkout existente não é o esperado.' >&2; exit 1; }
[[ -z "$(runuser -u cultura-importer -- git -C "$cultura_checkout" status --porcelain)" ]] || { echo 'Há alterações locais: preserve-as antes de continuar.' >&2; exit 1; }
[[ -f "$cultura_checkout/automation/cli.mjs" ]] || { echo 'Mescle o PR antes de instalar. Checkout não atualizado automaticamente.' >&2; exit 1; }
install -d -m 0700 -o cultura-importer -g cultura-importer "$cultura_checkout/automation/state"
systemd-analyze verify "$cultura_checkout/automation/systemd/cultura-importer.service" "$cultura_checkout/automation/systemd/cultura-importer.timer"
for unit in cultura-importer.service cultura-importer.timer; do
  if [[ -e "/etc/systemd/system/$unit" ]] && ! cmp -s "$cultura_checkout/automation/systemd/$unit" "/etc/systemd/system/$unit"; then
    echo "Unidade $unit já existe com conteúdo diferente. Revise antes de substituir." >&2; exit 1
  fi
done
install -m 0644 "$cultura_checkout/automation/systemd/cultura-importer.service" /etc/systemd/system/
install -m 0644 "$cultura_checkout/automation/systemd/cultura-importer.timer" /etc/systemd/system/
systemctl daemon-reload
echo 'Instalado sem iniciar nem habilitar o timer. Para testar com limites:'
echo 'sudo systemctl start cultura-importer.service'
echo 'sudo journalctl -u cultura-importer.service -n 40 --no-pager'
