#!/usr/bin/env bash
# Read-only. Use before and after changing Settings > Launch at login.
# Do not emit full paths, login names, credentials or private repo names.
set -euo pipefail

echo "RepoTicker login-launch acceptance (Linux)"
printf 'UTC: '; date -u '+%Y-%m-%dT%H:%M:%SZ'
printf 'Desktop: %s\n' "${XDG_CURRENT_DESKTOP:-unknown}"
printf 'Session: %s\n' "${XDG_SESSION_TYPE:-unknown}"
echo "Binary process count (current user):"
ps -u "$(id -u)" -o comm= | awk '
  $1 == "repo-ticker" || $1 == "RepoTicker" ||
  $1 == "repoticker-des" || $1 == "repoticker-desk" { count++ }
  END { print count+0 }
'
dir="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"
if [[ ! -d "$dir" ]]; then
  echo "XDG autostart entry count: 0"
else
  shopt -s nullglob
  count=0
  for entry in "$dir"/*.desktop; do
    if grep -Eiq '^(Name|Exec|X-GNOME-Autostart-enabled)=(.*[Rr]epo[- ]?[Tt]icker|.*repoticker)' "$entry"; then
      count=$((count+1))
      printf 'Autostart entry name: %s\n' "$(basename "$entry")"
      # Never print the Exec path; it can expose home directories.
      if grep -Eqi '^Hidden=true$|^X-GNOME-Autostart-enabled=false$' "$entry"; then
        echo "Entry flags: disabled/hidden"
      else
        echo "Entry flags: enabled/unspecified"
      fi
    fi
  done
  printf 'XDG autostart entry count: %d\n' "$count"
fi
echo "Check Settings checkbox separately. Process and entry counts alone"
echo "do not establish successful login or package removal."
