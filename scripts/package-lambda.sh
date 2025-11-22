#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build"
STANDALONE_DIR="${ROOT_DIR}/.next/standalone"
PUBLIC_DIR="${ROOT_DIR}/public"
STATIC_DIR="${ROOT_DIR}/.next/static"
RUN_SCRIPT="${ROOT_DIR}/scripts/assets/lambda-run.sh"

if [ ! -d "${STANDALONE_DIR}" ]; then
  echo "Missing .next/standalone directory. Run \`npm run build\` before packaging." >&2
  exit 1
fi

if [ ! -f "${RUN_SCRIPT}" ]; then
  echo "Missing Lambda run script at scripts/assets/lambda-run.sh" >&2
  exit 1
fi

rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

cp -a "${STANDALONE_DIR}/." "${BUILD_DIR}/"

if [ -d "${PUBLIC_DIR}" ]; then
  mkdir -p "${BUILD_DIR}/public"
  cp -a "${PUBLIC_DIR}/." "${BUILD_DIR}/public/"
fi

if [ -d "${STATIC_DIR}" ]; then
  mkdir -p "${BUILD_DIR}/.next/static"
  cp -a "${STATIC_DIR}/." "${BUILD_DIR}/.next/static/"
fi

mkdir -p "${BUILD_DIR}/.next"
rm -rf "${BUILD_DIR}/.next/cache"
if ! ln -s /tmp/cache "${BUILD_DIR}/.next/cache"; then
  echo "Failed to create symlink for .next/cache." >&2
  exit 1
fi

cp "${RUN_SCRIPT}" "${BUILD_DIR}/run.sh"
chmod +x "${BUILD_DIR}/run.sh"

echo "Prepared Lambda package directory at ${BUILD_DIR}"
