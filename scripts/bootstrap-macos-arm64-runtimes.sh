#!/bin/sh

set -eu

CALLYSTO_RUNTIME_ROOT="${1:-/private/tmp/callysto-runtime-v24.18.0-py3.14.6}"
CALLYSTO_DOWNLOAD_DIR="$CALLYSTO_RUNTIME_ROOT/downloads"
CALLYSTO_NODE_DIR="$CALLYSTO_RUNTIME_ROOT/node"
CALLYSTO_PYTHON_DIR="$CALLYSTO_RUNTIME_ROOT/python"

CALLYSTO_NODE_ARCHIVE="$CALLYSTO_DOWNLOAD_DIR/node-v24.18.0-darwin-arm64.tar.gz"
CALLYSTO_NODE_SHA256="e1a97e14c99c803e96c7339403282ea05a499c32f8d83defe9ef5ec66f979ed1"
CALLYSTO_NODE_URL="https://nodejs.org/dist/v24.18.0/node-v24.18.0-darwin-arm64.tar.gz"

CALLYSTO_PYTHON_ARCHIVE="$CALLYSTO_DOWNLOAD_DIR/cpython-3.14.6+20260623-aarch64-apple-darwin-install_only_stripped.tar.gz"
CALLYSTO_PYTHON_SHA256="35d774f61d63c1fd4f1bc9495a7ada92e500dc4382a0df8a9910eb87ea48e8cf"
CALLYSTO_PYTHON_URL="https://github.com/astral-sh/python-build-standalone/releases/download/20260623/cpython-3.14.6%2B20260623-aarch64-apple-darwin-install_only_stripped.tar.gz"

if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
  echo "This bootstrap is intentionally limited to macOS arm64." >&2
  exit 1
fi

mkdir -p "$CALLYSTO_DOWNLOAD_DIR" "$CALLYSTO_NODE_DIR" "$CALLYSTO_PYTHON_DIR"

download_and_verify() {
  callysto_url="$1"
  callysto_archive="$2"
  callysto_checksum="$3"
  callysto_partial="$callysto_archive.part"

  if [ -f "$callysto_archive" ] && printf '%s  %s\n' "$callysto_checksum" "$callysto_archive" | shasum -a 256 -c - >/dev/null 2>&1; then
    return
  fi

  curl --proto '=https' --tlsv1.2 -fL "$callysto_url" -o "$callysto_partial"
  printf '%s  %s\n' "$callysto_checksum" "$callysto_partial" | shasum -a 256 -c -
  mv "$callysto_partial" "$callysto_archive"
}

download_and_verify "$CALLYSTO_NODE_URL" "$CALLYSTO_NODE_ARCHIVE" "$CALLYSTO_NODE_SHA256"
download_and_verify "$CALLYSTO_PYTHON_URL" "$CALLYSTO_PYTHON_ARCHIVE" "$CALLYSTO_PYTHON_SHA256"

if [ ! -x "$CALLYSTO_NODE_DIR/bin/node" ]; then
  tar -xzf "$CALLYSTO_NODE_ARCHIVE" -C "$CALLYSTO_NODE_DIR" --strip-components=1
fi

if [ ! -x "$CALLYSTO_PYTHON_DIR/bin/python3" ]; then
  tar -xzf "$CALLYSTO_PYTHON_ARCHIVE" -C "$CALLYSTO_PYTHON_DIR" --strip-components=1
fi

CALLYSTO_PINNED_PATH="$CALLYSTO_NODE_DIR/bin:$CALLYSTO_PYTHON_DIR/bin:/usr/bin:/bin"

test "$(PATH="$CALLYSTO_PINNED_PATH" node --version)" = "v24.18.0"
test "$(PATH="$CALLYSTO_PINNED_PATH" npm --version)" = "11.16.0"
test "$(PATH="$CALLYSTO_PINNED_PATH" python3 --version 2>&1)" = "Python 3.14.6"

printf '%s\n' "Pinned Callysto runtimes are ready."
printf 'Node: %s\n' "$CALLYSTO_NODE_DIR/bin/node"
printf 'Python: %s\n' "$CALLYSTO_PYTHON_DIR/bin/python3"
printf 'Run: export PATH="%s"\n' "$CALLYSTO_PINNED_PATH"
