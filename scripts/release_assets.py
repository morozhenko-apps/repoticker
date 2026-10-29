#!/usr/bin/env python3
"""Validate and canonicalize platform bundles; no remote writes."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

TYPES = {
    "linux": [".deb", ".AppImage"],
    "windows": [".exe"],
    "macos": [".dmg"],
}
MIMES = {
    ".deb": "application/vnd.debian.binary-package",
    ".AppImage": "application/octet-stream",
    ".exe": "application/octet-stream",
    ".dmg": "application/x-apple-diskimage",
}


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for buf in iter(lambda: f.read(1024 * 1024), b""):
            h.update(buf)
    return h.hexdigest()


def canonical(version, platform, ext):
    if ext == ".deb":
        return f"repoticker_{version}_amd64.deb"
    if ext == ".AppImage":
        return f"RepoTicker-{version}-linux-x64.AppImage"
    if ext == ".exe":
        return f"RepoTicker-Setup-{version}-win-x64.exe"
    if ext == ".dmg":
        return f"RepoTicker-{version}-macos-arm64.dmg"
    raise ValueError("Unexpected suffix")


SEMVER = re.compile(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\Z")


def source_has_version(filename, version):
    # A substring match would silently relabel v11.0.0 as v1.0.0,
    # or v1.0.0.1 as v1.0.0. Require a whole numeric version token.
    return re.search(r"(?<![0-9.])" + re.escape(version) +
                     r"(?![0-9.])", filename) is not None


def collect(source, target, platform, version):
    if not SEMVER.fullmatch(version):
        raise ValueError("Invalid candidate release version")
    if target.exists() and any(target.iterdir()):
        raise ValueError("Refusing non-empty output directory")
    results = []
    for ext in TYPES[platform]:
        choices = [
            p for p in source.rglob("*") if p.is_file() and not p.is_symlink()
            and p.name.endswith(ext) and source_has_version(p.name, version)
            and "debug" not in p.parts
        ]
        if len(choices) != 1:
            raise ValueError(f"Expected one {platform} {ext} bundle, found {len(choices)}")
        file = choices[0]
        if not 0 < file.stat().st_size < 350 * 1024 * 1024:
            raise ValueError("Invalid artifact size")
        if ext == ".deb":
            for key, expected in [("Package", "repoticker"), ("Version", version),
                                  ("Architecture", "amd64")]:
                value = subprocess.check_output(["dpkg-deb", "-f", str(file), key], text=True).strip()
                if value != expected:
                    raise ValueError(f"Invalid Debian {key}: {value}")
            deps = subprocess.check_output(["dpkg-deb", "-f", str(file), "Depends"], text=True)
            if "libgtk-layer-shell0" not in deps:
                raise ValueError("Linux runtime dependency missing from .deb")
            # Package metadata alone does not prove the desktop launcher
            # or executable is canonical. Inspect only an untrusted archive
            # in a fresh temporary directory; never execute its contents.
            with tempfile.TemporaryDirectory(prefix="repoticker-deb-audit-") as folder:
                subprocess.run(["dpkg-deb", "--extract", str(file), folder],
                               check=True, capture_output=True)
                root = Path(folder)
                executable = root / "usr/bin/repoticker"
                launcher = root / "usr/share/applications/repoticker.desktop"
                if not executable.is_file() or not launcher.is_file():
                    raise ValueError("DEB is missing canonical executable or launcher")
                desktop = launcher.read_text(encoding="utf-8").splitlines()
                if "Name=RepoTicker" not in desktop:
                    raise ValueError("DEB desktop launcher lost RepoTicker branding")
                commands = [line.removeprefix("Exec=").strip() for line in desktop
                            if line.startswith("Exec=")]
                if len(commands) != 1 or commands[0].split(" ", 1)[0] not in (
                        "repoticker", "/usr/bin/repoticker"):
                    raise ValueError("DEB desktop launcher points to wrong executable")
        target.mkdir(parents=True, exist_ok=True)
        dest = target / canonical(version, platform, ext)
        shutil.copyfile(file, dest)
        sha = digest(dest)
        (target / (dest.name + ".sha256")).write_text(sha + "  " + dest.name + "\n")
        results.append({"path": f"{platform}/{dest.name}", "sha256": sha,
                        "size": dest.stat().st_size, "contentType": MIMES[ext]})
    (target / "part.json").write_text(json.dumps(
        {"platform": platform, "version": version, "files": results}, indent=2, sort_keys=True
    ) + "\n")


def merge(parts, output, version):
    found = {}
    catalog = {}
    for path in parts:
        obj = json.loads(path.read_text())
        platform = obj["platform"]
        if platform not in TYPES or platform in found or obj["version"] != version:
            raise ValueError("Wrong or duplicate platform/version")
        found[platform] = True
        if {Path(v["path"]).suffix for v in obj["files"]} != set(TYPES[platform]):
            raise ValueError("Incomplete platform artifacts")
        for item in obj["files"]:
            rel = Path(item["path"])
            if rel.is_absolute() or len(rel.parts) != 2 or rel.parts[0] != platform:
                raise ValueError("Untrusted artifact path")
            local = path.parent / rel.name
            if not local.is_file() or local.stat().st_size != item["size"] or digest(local) != item["sha256"]:
                raise ValueError(f"Artifact checksum mismatch: {rel}")
            catalog[str(rel)] = item
    # macOS remains optional until an Apple signing account exists.
    required = {"linux", "windows"}
    if not required.issubset(found):
        raise ValueError("Missing platforms")
    output.write_text(json.dumps({
        "schema": 1, "product": "RepoTicker", "version": version,
        "base": "https://download.morozhenko.com/dist/RepoTicker/",
        "files": catalog
    }, indent=2, sort_keys=True) + "\n")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="command", required=True)
    c = sub.add_parser("collect")
    c.add_argument("--source", type=Path, required=True)
    c.add_argument("--target", type=Path, required=True)
    c.add_argument("--platform", choices=TYPES, required=True)
    c.add_argument("--version", required=True)
    m = sub.add_parser("merge")
    m.add_argument("--part", type=Path, action="append", required=True)
    m.add_argument("--output", type=Path, required=True)
    m.add_argument("--version", required=True)
    a = p.parse_args()
    try:
        if a.command == "collect":
            collect(a.source, a.target, a.platform, a.version)
        else:
            merge(a.part, a.output, a.version)
    except (ValueError, OSError, subprocess.CalledProcessError) as e:
        p.exit(1, f"{e}\n")


if __name__ == "__main__":
    main()
