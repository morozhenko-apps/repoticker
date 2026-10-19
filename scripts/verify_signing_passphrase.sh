#!/usr/bin/env bash
# Validate subkey-only CI material against the actual signing passphrase.
# Usage: gpg --export-secret-subkeys "$FPR" | bash verify_signing_passphrase.sh "$FPR" /private/passphrase
set -euo pipefail
umask 077

FPR="${1:-}"
PASSPHRASE_FILE="${2:-}"
if [[ $# -ne 2 || ! "$FPR" =~ ^[0-9a-fA-F]{40}$ || ! -s "$PASSPHRASE_FILE" ]]; then
  echo "Usage: verify_signing_passphrase.sh <40-hex-fingerprint> <nonempty-private-passphrase-file>" >&2
  exit 2
fi
for item in gpg gpgconf gpgv python3; do
  command -v "$item" >/dev/null || { echo "Missing $item" >&2; exit 1; }
done

tmp="$(mktemp -d)"
cleanup() {
  gpgconf --homedir "$tmp/gnupg" --kill gpg-agent >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT
mkdir -m 700 "$tmp/gnupg"

# Consume the exported signing subkeys exactly as CI does. Never persist
# private key bytes on disk or share the source keyring's cached GPG agent.
if ! gpg --homedir "$tmp/gnupg" --batch --import >/dev/null 2>&1; then
  echo "Cannot import the signing-only key export" >&2
  exit 1
fi
gpg --homedir "$tmp/gnupg" --batch --with-colons --list-secret-keys "$FPR" \
  > "$tmp/inventory"
python3 "$(dirname "$0")/verify_signing_key.py" \
  --listing "$tmp/inventory" --fingerprint "$FPR"

printf 'RepoTicker isolated signing validation\n' > "$tmp/Release"
if ! gpg --homedir "$tmp/gnupg" --batch --yes --no-tty \
    --pinentry-mode loopback --passphrase-file "$PASSPHRASE_FILE" \
    --digest-algo SHA256 --local-user "$FPR" \
    --clearsign --output "$tmp/InRelease" "$tmp/Release" >/dev/null 2>&1; then
  echo "Signing subkey rejected the provided passphrase" >&2
  exit 1
fi
gpg --homedir "$tmp/gnupg" --batch --export "$FPR" > "$tmp/public.gpg"
if ! gpgv --keyring "$tmp/public.gpg" "$tmp/InRelease" >/dev/null 2>&1; then
  echo "Signing subkey verification failed" >&2
  exit 1
fi
echo "Isolated signing subkey/passphrase verification passed."
