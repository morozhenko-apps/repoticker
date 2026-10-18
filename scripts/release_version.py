#!/usr/bin/env python3
"""RepoTicker's three synchronized version markers (Cargo core/desktop + Tauri).

Manual release order: bump -> test -> merge into main -> tag main -> invoke
protected release workflow with the matching vMAJOR.MINOR.PATCH tag.
"""
import argparse
import json
from pathlib import Path
import re
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[1]
CARGO = (
    ROOT / "crates/repoticker-core/Cargo.toml",
    ROOT / "apps/desktop/src-tauri/Cargo.toml",
)
TAURI = ROOT / "apps/desktop/src-tauri/tauri.conf.json"
SEMVER = re.compile(r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)\Z")
PACKAGE_VERSION = re.compile(r'(?m)^version\s*=\s*"([^"]+)"\s*$')


def versions():
    values = [tomllib.loads(path.read_text())["package"]["version"] for path in CARGO]
    values.append(json.loads(TAURI.read_text())["version"])
    if len(set(values)) != 1 or not SEMVER.fullmatch(values[0]):
        raise ValueError("Core, desktop and Tauri must use identical MAJOR.MINOR.PATCH versions")
    return values[0]


def bump(which):
    old = versions()
    nums = [int(part) for part in old.split(".")]
    index = {"major": 0, "minor": 1, "patch": 2}[which]
    nums[index] += 1
    for part in range(index + 1, 3):
        nums[part] = 0
    new = ".".join(map(str, nums))
    for path in CARGO:
        text = path.read_text()
        updated, count = PACKAGE_VERSION.subn(
            lambda match: 'version = "' + new + '"' if match.group(1) == old else match.group(),
            text, count=1
        )
        if count != 1 or text == updated:
            raise ValueError(f"Cannot update {path}")
        path.write_text(updated)
    data = json.loads(TAURI.read_text())
    data["version"] = new
    TAURI.write_text(json.dumps(data, indent=2) + "\n")
    assert versions() == new
    return new


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--bump", choices=["major", "minor", "patch"])
    group.add_argument("--check-tag", metavar="TAG")
    args = parser.parse_args()
    try:
        if args.bump:
            print(bump(args.bump))
        else:
            current = versions()
            if args.check_tag and args.check_tag != "v" + current:
                raise ValueError(f"Tag {args.check_tag} does not match v{current}")
            print(current)
    except ValueError as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
