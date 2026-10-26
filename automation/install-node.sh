#!/usr/bin/env bash
set -euo pipefail
# Installs only the Node binary and its license in a private prefix; no npm or apt.
cultura_mode="${1:-}"
if [[ "$cultura_mode" != '--apply' && "$cultura_mode" != '--check' ]]; then
  cat <<'TEXT'
Node.js 24 LTS exclusivo do coletor.
  --check: baixa do nodejs.org via HTTPS, confere SHA-256 e testa em /tmp; não instala.
  --apply: faz a mesma verificação e instala somente em /opt/cultura-node.
Não altera /usr/bin, PATH, apt, Koha, bancos ou serviços em execução.
TEXT
  exit 0
fi
if [[ "$cultura_mode" == '--apply' && $EUID -ne 0 ]]; then
  echo 'Use sudo para --apply. --check não exige sudo.' >&2; exit 1
fi
for cultura_command in curl sha256sum tar uname mktemp install; do command -v "$cultura_command" >/dev/null; done
if [[ "$cultura_mode" == '--apply' && ( -e /opt/cultura-node/current || -L /opt/cultura-node/current ) ]]; then
  [[ -L /opt/cultura-node/current ]] || { echo '/opt/cultura-node/current já existe e não é um link. Nada foi substituído.' >&2; exit 1; }
  cultura_existing="$(readlink -f /opt/cultura-node/current)"
  case "$cultura_existing" in /opt/cultura-node/releases/node-v24.*-linux-*) ;; *) echo 'Runtime existente fora do padrão. Nada foi alterado.' >&2; exit 1 ;; esac
  [[ -f "$cultura_existing/node.sha256" ]] || { echo 'Runtime existente sem checksum local. Revise antes de usar.' >&2; exit 1; }
  (cd "$cultura_existing" && sha256sum --check node.sha256)
  "$cultura_existing/bin/node" -e 'if(Number(process.versions.node.split(".")[0])!==24)process.exit(1)'
  echo "Runtime privado já instalado: $("$cultura_existing/bin/node" --version). Não foi atualizado."
  exit 0
fi
case "$(uname -m)" in x86_64) cultura_arch=x64 ;; aarch64|arm64) cultura_arch=arm64 ;; *) echo 'Arquitetura não suportada por este instalador.' >&2; exit 1 ;; esac
cultura_tmp="$(mktemp -d /tmp/cultura-node.XXXXXXXX)"
trap 'rm -rf -- "$cultura_tmp"' EXIT
cultura_source='https://nodejs.org/dist'
curl --fail --silent --show-error --proto '=https' --tlsv1.2 --connect-timeout 15 --max-time 60 "$cultura_source/latest-v24.x/SHASUMS256.txt" -o "$cultura_tmp/SHASUMS256.txt"
cultura_pattern="^[0-9a-f]{64}  node-v24\.[0-9]+\.[0-9]+-linux-${cultura_arch}\.tar\.xz$"
cultura_line="$(grep -E "$cultura_pattern" "$cultura_tmp/SHASUMS256.txt")"
[[ "$(printf '%s\n' "$cultura_line" | wc -l)" -eq 1 ]] || { echo 'Manifesto oficial não contém um único arquivo esperado.' >&2; exit 1; }
cultura_file="${cultura_line##* }"
cultura_directory="${cultura_file%.tar.xz}"
cultura_version="${cultura_directory#node-}"
cultura_version="${cultura_version%-linux-*}"
curl --fail --silent --show-error --proto '=https' --tlsv1.2 --connect-timeout 15 --max-time 180 "$cultura_source/$cultura_version/$cultura_file" -o "$cultura_tmp/$cultura_file"
printf '%s\n' "$cultura_line" > "$cultura_tmp/selected.sha256"
(cd "$cultura_tmp" && sha256sum --check selected.sha256)
tar -xJf "$cultura_tmp/$cultura_file" -C "$cultura_tmp" --no-same-owner --no-same-permissions "$cultura_directory/bin/node" "$cultura_directory/LICENSE"
[[ "$("$cultura_tmp/$cultura_directory/bin/node" --version)" == "$cultura_version" ]] || { echo 'Versão executada difere do arquivo verificado.' >&2; exit 1; }
"$cultura_tmp/$cultura_directory/bin/node" -e 'if(Number(process.versions.node.split(".")[0])!==24)process.exit(1); console.log("Node privado testado:",process.version,process.arch)'
if [[ "$cultura_mode" == '--check' ]]; then
  echo 'Download, checksum e execução passaram. Nenhum runtime foi instalado.'; exit 0
fi
cultura_destination="/opt/cultura-node/releases/$cultura_directory"
[[ ! -e "$cultura_destination" ]] || { echo 'Diretório da versão já existe. Nada foi sobrescrito; revise antes de continuar.' >&2; exit 1; }
install -d -m 0755 /opt/cultura-node/releases "$cultura_destination/bin"
install -m 0755 "$cultura_tmp/$cultura_directory/bin/node" "$cultura_destination/bin/node"
install -m 0644 "$cultura_tmp/$cultura_directory/LICENSE" "$cultura_destination/LICENSE"
install -m 0644 "$cultura_tmp/SHASUMS256.txt" "$cultura_destination/SHASUMS256.txt"
(cd "$cultura_destination" && sha256sum bin/node > node.sha256)
chmod 0644 "$cultura_destination/node.sha256"
ln -s "$cultura_destination" /opt/cultura-node/current
/opt/cultura-node/current/bin/node --version
echo 'Instalado em /opt/cultura-node. Nenhum serviço foi iniciado ou reiniciado.'
