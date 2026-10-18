# RepoTicker icon import

The source art belongs to the user and is **not** stored here yet. Use the
user-supplied square transparent PNG without generating a substitute:

```bash
sudo apt install python3-pil
cd ~/Documents/GitHub/repoticker
python3 tools/import_icon.py ~/Downloads/Icon.png
```

This generates resized PNGs (16–512 px), an ICO with multiple sizes and
a macOS ICNS. Verify `icon-16.png` looks legible in a KDE system tray.
`icons/icon.png` also supplies the native Linux StatusNotifierItem pixels
and the Windows/macOS Tauri tray icon. PNGs are **not** transformed into fonts.
The script reads from the local filesystem; ChatGPT's GitHub connector cannot
access `~/Downloads`.

Commit generated assets to `dev` only after visual review. macOS packaging
should include the generated ICNS when a release build is configured.
