#!/usr/bin/env bash
# Safe unpublished Linux QA installer and launcher, independent of current directory.
# Usage: bash scripts/install_qa_linux.sh RUN_ID SOURCE_SHA
set -euo pipefail
REPO="morozhenko-apps/repoticker"
if [[ "$#" -ne 2 || ! "$1" =~ ^[0-9]+$ || ! "$2" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash scripts/install_qa_linux.sh RUN_ID SOURCE_SHA" >&2
  exit 2
fi
for binary in gh sha256sum dpkg-deb dpkg-query sudo; do
  command -v "$binary" >/dev/null || { echo "Missing: $binary" >&2; exit 1; }
done
RESULT="$(gh run view "$1" -R "$REPO" --json conclusion --jq '.conclusion')"
if [[ "$RESULT" != "success" ]]; then
  echo "Refusing unsuccessful CI run: $RESULT" >&2
  exit 1
fi
mkdir -p "$HOME/Downloads"
OUT="$(mktemp -d "$HOME/Downloads/repoticker-qa-$1-XXXXXXXX")"
echo "Extracting to a new QA directory: $OUT"
gh run download "$1" -R "$REPO" -n repoticker-acceptance-linux -D "$OUT"
SOURCE="$(tr -d '\r\n' < "$OUT/SOURCE_SHA.txt")"
if [[ "$SOURCE" != "$2" ]]; then
  echo "Wrong source SHA; installation refused" >&2
  exit 1
fi
(
  cd "$OUT"
  sha256sum -c -- *.sha256
)
DEB="$OUT/repo-ticker_0.2.0_amd64.deb"
if [[ ! -f "$DEB" ||
      "$(dpkg-deb -f "$DEB" Package)" != "repo-ticker" ||
      "$(dpkg-deb -f "$DEB" Version)" != "0.2.0" ]]; then
  echo "Unexpected DEB package; installation refused" >&2
  exit 1
fi
echo "Close existing RepoTicker via tray Quit before confirming the install."
sudo apt install "$DEB"
BIN="$(dpkg-query -L repo-ticker | grep -E '^/usr/bin/[^/]+$' || true)"
if [[ -z "$BIN" || "$BIN" == *$'\n'* || ! -x "$BIN" ]]; then
  echo "Cannot identify exactly one installed executable: $BIN" >&2
  exit 1
fi
echo "Launching installed executable: $BIN"
exec "$BIN"
