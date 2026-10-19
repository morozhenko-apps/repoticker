#!/usr/bin/env python3
"""Publish verified artifacts to *only* dist/RepoTicker in Cloudflare R2.

Requires explicit deployment secrets. Versioned objects are immutable.
InRelease is uploaded LAST. Public readback must match source bytes.
"""
import argparse
import hashlib
import os
from pathlib import Path
import re
import time
import urllib.request

PREFIX = "dist/RepoTicker"
BASE = "https://download.morozhenko.com/dist/RepoTicker"
TYPES = {
    ".deb": "application/vnd.debian.binary-package",
    ".AppImage": "application/octet-stream",
    ".exe": "application/octet-stream",
    ".gz": "application/gzip",
    ".gpg": "application/pgp-keys",
    ".sha256": "text/plain",
    ".json": "application/json",
}


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def media(path):
    if path.name == "InRelease" or path.name == "Release":
        return "text/plain"
    return TYPES.get(path.suffix, "application/octet-stream")


def source_map(release, apt, version):
    # Do not allow a compromised/incorrect artifact job to make us publish
    # arbitrary side files simply because their names include the version.
    from release_assets import TYPES, canonical, digest
    import json
    result = {}
    for platform in ("linux", "windows"):
        base = release / platform
        if not base.is_dir() or not (base / "part.json").is_file():
            raise ValueError("Missing verified platform artifact directory " + str(base))
        manifest = json.loads((base / "part.json").read_text())
        if manifest.get("platform") != platform or manifest.get("version") != version:
            raise ValueError("Wrong artifact platform/version")
        required = set()
        entries = {}
        for extension in TYPES[platform]:
            name = canonical(version, platform, extension)
            required.update((name, name + ".sha256"))
            binary = base / name
            sidecar = base / (name + ".sha256")
            if not binary.is_file() or not sidecar.is_file() or binary.is_symlink():
                raise ValueError("Missing or unsafe native release artifact: " + name)
            checksum = digest(binary)
            if sidecar.read_text().strip() != checksum + "  " + name:
                raise ValueError("Release checksum sidecar mismatch: " + name)
            entries[f"{platform}/{name}"] = (checksum, binary.stat().st_size)
        if {file.name for file in base.iterdir() if file.is_file()} != required | {"part.json"}:
            raise ValueError("Unexpected file in release artifact directory " + str(base))
        actual = {
            item["path"]: (item["sha256"], item["size"])
            for item in manifest.get("files", [])
        }
        if actual != entries or len(manifest.get("files", [])) != len(entries):
            raise ValueError("Artifact manifest mismatch: " + platform)
        for name in sorted(required):
            result[f"releases/v{version}/{platform}/{name}"] = base / name
    index = apt / "dists/stable/main/binary-amd64"
    package = apt / f"pool/main/r/repo-ticker/repo-ticker_{version}_amd64.deb"
    keyring = apt / "repoticker-archive-keyring.gpg"
    mutable = apt / "dists/stable/InRelease"
    immutable = [package, keyring]
    mutable_indexes = [index / "Packages", index / "Packages.gz"]
    if not all(path.is_file() and not path.is_symlink()
               for path in immutable + mutable_indexes + [mutable]):
        raise ValueError("Incomplete signed APT snapshot")
    from release_assets import digest as checksum
    for path in mutable_indexes:
        hashed = index / "by-hash/SHA256" / checksum(path)
        if not hashed.is_file() or hashed.is_symlink() or checksum(hashed) != checksum(path):
            raise ValueError("Missing or invalid APT by-hash index: " + path.name)
        immutable.append(hashed)
    for path in immutable:
        result["apt/" + path.relative_to(apt).as_posix()] = path
    # These filenames stay constant across releases, so their contents are
    # mutable and must not be served with immutable caching. InRelease is last.
    mutable_paths = [
        ("apt/" + path.relative_to(apt).as_posix(), path)
        for path in mutable_indexes
    ]
    mutable_paths.append(("apt/dists/stable/InRelease", mutable))
    return result, mutable_paths


def public_verify(path, key):
    url = BASE + "/" + key
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=45) as resp:
                if resp.status != 200:
                    raise ValueError(f"HTTP {resp.status} for {key}")
                downloaded = hashlib.sha256()
                while block := resp.read(1024 * 1024):
                    downloaded.update(block)
                if downloaded.hexdigest() == sha(path):
                    return
                raise ValueError("Public checksum mismatch for " + key)
        except (OSError, ValueError):
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))


def publish(release, apt, version, account, access_key, secret):
    if not re.fullmatch("[0-9a-f]{32}", account):
        raise ValueError("Invalid Cloudflare account ID")
    if not access_key or not secret:
        raise ValueError("Missing scoped R2 credentials")
    import boto3
    from botocore.config import Config

    client = boto3.client(
        "s3", endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        region_name="auto", aws_access_key_id=access_key, aws_secret_access_key=secret,
        config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"})
    )
    items, mutable_paths = source_map(release, apt, version)
    def upload(key, file, immutable):
        object_key = PREFIX + "/" + key
        existing = None
        try:
            existing = client.head_object(Bucket="app-dist", Key=object_key)
        except client.exceptions.NoSuchKey:
            pass
        except Exception as exc:
            status = getattr(exc, "response", {}).get("ResponseMetadata", {}).get("HTTPStatusCode")
            if status != 404:
                raise
        if existing:
            if not immutable:
                pass
            else:
                if existing.get("Metadata", {}).get("sha256") != sha(file):
                    raise ValueError(f"Immutable R2 key already contains different bytes: {object_key}")
                return
        # Mutable indexes and InRelease are serialized by the one-at-a-time
        # release workflow. The signed InRelease must always be written last.
        client.upload_file(str(file), "app-dist", object_key, ExtraArgs={
            "ContentType": media(file),
            "Metadata": {"sha256": sha(file)},
            "CacheControl": "public,max-age=31536000,immutable" if immutable else "no-store",
        })
        obj = client.get_object(Bucket="app-dist", Key=object_key)
        digest = hashlib.sha256()
        for part in obj["Body"].iter_chunks(chunk_size=1024 * 1024):
            if part:
                digest.update(part)
        if digest.hexdigest() != sha(file):
            raise ValueError("R2 readback failed: " + object_key)

    for key, path in sorted(items.items()):
        upload(key, path, True)
    # Verify the public read-only projection BEFORE rotating the current index.
    pool = next((key for key in items if key.startswith("apt/pool/")), None)
    if pool is None:
        raise ValueError("No DEB in APT pool")
    public_verify(items[pool], pool)
    apt_key = next((key for key in items if key.endswith("repoticker-archive-keyring.gpg")), None)
    if not apt_key:
        raise ValueError("Missing public signing key")
    public_verify(items[apt_key], apt_key)
    for key, path in items.items():
        if "/by-hash/" in key:
            public_verify(path, key)
    for key, path in mutable_paths:
        upload(key, path, False)
        public_verify(path, key)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--release", required=True, type=Path)
    p.add_argument("--apt", required=True, type=Path)
    p.add_argument("--version", required=True)
    a = p.parse_args()
    publish(a.release, a.apt, a.version,
            os.environ["REPOTICKER_R2_ACCOUNT_ID"],
            os.environ.get("REPOTICKER_R2_ACCESS_KEY_ID", ""),
            os.environ.get("REPOTICKER_R2_SECRET_ACCESS_KEY", ""))


if __name__ == "__main__":
    main()
