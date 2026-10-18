#!/usr/bin/env bash
# Send only the private signing subkey to GitHub; back up full secret encrypted.
set -euo pipefail
umask 077

REPO="morozhenko-apps/repoticker"
ENVIRONMENT="apt-release"
BACKUP="$HOME/morozhenko/secrets/RepoTicker"
FPR="$1"

if [[ ! "$FPR" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "Usage: bash scripts/provision_apt_key.sh <40-character GPG fingerprint>" >&2
  exit 2
fi
for item in gh gpg base64; do
  command -v "$item" >/dev/null || { echo "Missing $item" >&2; exit 1; }
done
[[ -d "$BACKUP" ]] || {
  echo "The mounted Google Drive directory does not exist: $BACKUP" >&2
  echo "Verify the mount; refusing to create a backup in a local lookalike directory." >&2
  exit 1
}
gh auth status >/dev/null
gh api "repos/$REPO/environments/$ENVIRONMENT" --jq .name >/dev/null || {
  echo "Configure GitHub environment '$ENVIRONMENT' with required reviewers first." >&2
  exit 1
}
gpg --list-secret-keys --with-colons "$FPR" | grep -q '^sec' || {
  echo "Missing local full private key $FPR" >&2; exit 1;
}
filename="repoticker-apt-full-secret-$(date -u +%Y%m%d)-$(printf '%.12s' "$FPR").asc.gpg"
[[ ! -e "$BACKUP/$filename" ]] || { echo "Refusing overwrite: $filename" >&2; exit 1; }

printf 'Backup encryption passphrase (separate from signing passphrase): ' >&2
IFS= read -rs backup_pass
printf '\nRepeat backup passphrase: ' >&2
IFS= read -rs repeat_pass
printf '\n' >&2
[[ "$backup_pass" =~ .{16} && "$backup_pass" == "$repeat_pass" ]] || {
  echo "Backup password must contain 16+ characters and match." >&2; exit 1;
}
unset repeat_pass
# Stream full private key directly through AES256: never write plaintext to disk.
gpg --armor --export-secret-keys "$FPR" |
  gpg --batch --yes --pinentry-mode loopback --cipher-algo AES256 \
    --passphrase-file <(printf '%s\n' "$backup_pass") \
    --symmetric --output "$BACKUP/$filename"
unset backup_pass

gpg --export "$FPR" > "$BACKUP/repoticker-archive-keyring.gpg"
gpg --armor --export "$FPR" > "$BACKUP/repoticker-public.asc"
printf '%s\n' "$FPR" > "$BACKUP/FINGERPRINT"
chmod 600 "$BACKUP/$filename"
chmod 644 "$BACKUP/repoticker-archive-keyring.gpg" "$BACKUP/repoticker-public.asc" "$BACKUP/FINGERPRINT"

echo "Encrypted full-key backup: $BACKUP/$filename"
echo "Setting GitHub environment secrets with only a signing subkey..."
gpg --export-secret-subkeys "$FPR" | base64 -w0 |
  gh secret set REPOTICKER_APT_SIGNING_SUBKEY_BASE64 -R "$REPO" -e "$ENVIRONMENT"
printf 'Signing subkey passphrase: ' >&2
IFS= read -rs key_pass
printf '\n' >&2
[[ -n "$key_pass" ]] || { echo "Empty signing passphrase rejected." >&2; exit 1; }
printf '%s' "$key_pass" |
  gh secret set REPOTICKER_APT_SIGNING_PASSPHRASE -R "$REPO" -e "$ENVIRONMENT"
unset key_pass
gh variable set REPOTICKER_APT_FINGERPRINT -R "$REPO" -e "$ENVIRONMENT" --body "$FPR"
echo "Protected GitHub signing subkey configured."
echo "Store the backup encryption passphrase separately in your password manager."
