#!/usr/bin/env bash
# Safe unpublished Linux QA installer and launcher, independent of current directory.
# Usage: bash scripts/install_qa_linux.sh RUN_ID SOURCE_SHA
set -euo pipefail
REPO="morozhenko-apps/repoticker"
if [[ "$#" -ne 2 || ! "$1" =~ ^[0-9]+$ || ! "$2" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash scripts/install_qa_linux.sh RUN_ID SOURCE_SHA" >&2
  exit 2
fi
for binary in gh sha256sum dpkg-deb dpkg-query sudo pgrep python3 cmp; do
  command -v "$binary" >/dev/null || { echo "Missing: $binary" >&2; exit 1; }
done
# The legacy DEB is a DIFFERENT package. Never silently leave two
# launchers or autostart registrations with the same application identity.
if [[ "$(dpkg-query -W -f='${Status}' repo-ticker 2>/dev/null || true)" == "install ok installed" ]]; then
  echo "Legacy package repo-ticker is installed. Close RepoTicker and run:" >&2
  echo "  sudo apt remove repo-ticker" >&2
  echo "Then rerun this QA installer; your user settings will remain." >&2
  exit 1
fi
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
# The candidate workflow uses this same synchronized Cargo/Tauri version.
# Never choose a different DEB from the artifact directory by wildcard.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
VERSION="$(python3 "$SCRIPT_DIR/release_version.py")"
DEB="$OUT/repoticker_${VERSION}_amd64.deb"
if [[ ! -f "$DEB" ||
      "$(dpkg-deb -f "$DEB" Package)" != "repoticker" ||
      "$(dpkg-deb -f "$DEB" Version)" != "$VERSION" ||
      "$(dpkg-deb -f "$DEB" Architecture)" != "amd64" ]]; then
  echo "Unexpected DEB package; installation refused" >&2
  exit 1
fi
# Do not replace the on-disk DEB while an old installed/AppImage
# instance remains active: the single-instance plugin can leave the old
# UI and icons visible even after the package is reinstalled.
if pgrep -x repoticker >/dev/null || pgrep -f '[r]epoticker-desktop' >/dev/null; then
  echo "RepoTicker is still running. Use tray Quit, then retry." >&2
  exit 1
fi
# The accepted dev package can share its version number with the installed
# production DEB. Force replacement of that version with the checked local file.
sudo apt install --reinstall "$DEB"
BIN="/usr/bin/repoticker"
if [[ ! -x "$BIN" ]] || ! dpkg-query -L repoticker | grep -Fxq "$BIN"; then
  echo "Installed repoticker package has no expected executable: $BIN" >&2
  exit 1
fi
# Version equality does not prove which binary is installed. Verify the
# running target is byte-for-byte the payload from the checked CI artifact.
PAYLOAD="$(mktemp -d "$OUT/payload-XXXXXXXX")"
dpkg-deb -x "$DEB" "$PAYLOAD"
if [[ ! -f "$PAYLOAD/usr/bin/repoticker" ]] ||
    ! cmp -s "$BIN" "$PAYLOAD/usr/bin/repoticker"; then
  echo "Installed executable differs from verified CI package; refusing launch." >&2
  exit 1
fi
echo "Verified installed RepoTicker binary matches checked CI package."
echo "Launching RepoTicker: $BIN"
exec "$BIN"
