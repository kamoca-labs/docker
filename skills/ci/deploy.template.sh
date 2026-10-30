#!/bin/sh
set -eu

sha="${1:?give the SHA}"
host="${DEPLOY_HOST:?}"
dir="${DEPLOY_PATH:?}"
compose="docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod"

if [ -n "${REGISTRY_TOKEN:-}" ]; then
  echo "$REGISTRY_TOKEN" | ssh "$host" docker login "${REGISTRY_HOST:?}" -u "${REGISTRY_USER:?}" --password-stdin
fi

scp compose.yaml compose.prod.yaml "$host:$dir/"
ssh "$host" "cd $dir \
  && export IMAGE_TAG=$sha \
  && $compose pull \
  && $compose up -d --no-build --wait --remove-orphans \
  && docker image prune -af --filter 'until=168h'"
