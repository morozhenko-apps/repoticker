#!/usr/bin/env bash
# Send only the private signing subkey to GitHub; back up full secret encrypted.
set -euo pipefail
umask 077

REPO="morozhenko-apps/repoticker"
ENVIRONMENT="apt-release"
BACKUP="${REPOTICKER_SIGNING_BACKUP_DIR:-}"
FPR="${1:-}"

if [[ ! "$FPR" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "Usage: bash scripts/provision_apt_key.sh <40-character GPG fingerprint>" >&2
  exit 2
fi
if [[ -z "$BACKUP" || "$BACKUP" != /* || ! -d "$BACKUP" ]]; then
  echo "Set REPOTICKER_SIGNING_BACKUP_DIR to an existing absolute directory on a mounted backup volume." >&2
  exit 1
fi
for item in gh gpg base64 realpath findmnt; do
  command -v "$item" >/dev/null || { echo "Missing $item" >&2; exit 1; }
done
BACKUP="$(realpath -e -- "$BACKUP" 2>/dev/null)" || {
  echo "Signing backup destination cannot be resolved." >&2
  exit 1
}
MOUNT_TYPE="$(findmnt --target "$BACKUP" --noheadings --output FSTYPE 2>/dev/null)" || {
  echo "Signing backup mount cannot be verified." >&2
  exit 1
}
MOUNT_TARGET="$(findmnt --target "$BACKUP" --noheadings --output TARGET 2>/dev/null)" || {
  echo "Signing backup mount cannot be verified." >&2
  exit 1
}
case "$MOUNT_TYPE" in
  fuse*|nfs|nfs4|cifs|smb3|davfs|sshfs) ;;
  *)
    echo "Signing backup destination is not on a remote or FUSE filesystem." >&2
    exit 1
    ;;
esac
if [[ -z "$MOUNT_TARGET" || "$MOUNT_TARGET" == "/" || ! -w "$BACKUP" ]]; then
  echo "Signing backup volume is unavailable or not writable." >&2
  exit 1
fi
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

echo "Encrypted full-key backup stored on the mounted backup volume."
printf 'Signing subkey passphrase: ' >&2
IFS= read -rs key_pass
printf '\n' >&2
[[ -n "$key_pass" ]] || { echo "Empty signing passphrase rejected." >&2; exit 1; }

# Verify the exact subkey-only CI material in a fresh GPG agent context.
# Never update GitHub secrets with a password that has not signed and verified.
private_dir="$(mktemp -d)"
cleanup_signing_validation() {
  rm -rf "$private_dir"
  unset key_pass
}
trap cleanup_signing_validation EXIT
printf '%s' "$key_pass" > "$private_dir/passphrase"
gpg --export-secret-subkeys "$FPR" |
  bash "$(dirname "$0")/verify_signing_passphrase.sh" "$FPR" "$private_dir/passphrase"

echo "Signing subkey and passphrase validated; updating protected GitHub secrets."
gpg --export-secret-subkeys "$FPR" | base64 -w0 |
  gh secret set REPOTICKER_APT_SIGNING_SUBKEY_BASE64 -R "$REPO" -e "$ENVIRONMENT"
printf '%s' "$key_pass" |
  gh secret set REPOTICKER_APT_SIGNING_PASSPHRASE -R "$REPO" -e "$ENVIRONMENT"
unset key_pass
gh variable set REPOTICKER_APT_FINGERPRINT -R "$REPO" -e "$ENVIRONMENT" --body "$FPR"
echo "Protected GitHub signing subkey configured."
echo "Store the backup encryption passphrase separately in your password manager."
