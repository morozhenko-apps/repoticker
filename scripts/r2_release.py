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
    result = {}
    for platform in ("linux", "windows"):
        base = release / platform
        if not base.is_dir():
            raise ValueError("Missing release artifact directory " + str(base))
        for file in base.iterdir():
            if not file.is_file() or file.name == "part.json":
                continue
            if version not in file.name:
                raise ValueError("Wrong version in bundle")
            result[f"releases/v{version}/{platform}/{file.name}"] = file
    required = [
        "pool/main/r/repoticker", "dists/stable/main/binary-amd64/by-hash/SHA256"
    ]
    if not all((apt / p).is_dir() for p in required):
        raise ValueError("Incomplete signed APT snapshot")
    for file in apt.rglob("*"):
        if file.is_file() and file.name not in ("Release", "Packages", "Packages.gz") and \
                "/by-hash/" not in file.as_posix() and file.name != "InRelease":
            # pool deb and public keyring
            result["apt/" + file.relative_to(apt).as_posix()] = file
        elif file.is_file() and "/by-hash/" in file.as_posix():
            result["apt/" + file.relative_to(apt).as_posix()] = file
    mutable = apt / "dists/stable/InRelease"
    if not mutable.is_file():
        raise ValueError("Signed InRelease is absent")
    return result, ("apt/dists/stable/InRelease", mutable)


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
    items, mutable = source_map(release, apt, version)
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
        if not immutable and existing:
            # The only mutable object is signed InRelease. A single GitHub
            # concurrency group serializes our releases.
            pass
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
    upload(mutable[0], mutable[1], False)
    public_verify(mutable[1], mutable[0])


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
