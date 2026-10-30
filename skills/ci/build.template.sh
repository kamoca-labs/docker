#!/bin/sh
set -eu

registry="${REGISTRY:?set REGISTRY}"
project="<project>"
# One <service>:<image> pair for each distinct image. Replicas share one image: list only one of them.
pairs="<service>:<image>"
overrides=""
targets=""

for pair in $pairs; do
  service="${pair%%:*}"
  image="${pair##*:}"
  cache="type=registry,ref=$registry/$project-$image:buildcache"
  overrides="$overrides --set $service.cache-from=$cache --set $service.cache-to=$cache,mode=max"
  targets="$targets $service"
done

# The registry cache needs a docker-container builder. A dind service with TLS sets the connection
# in the environment, and buildx create refuses those settings. Give the builder a context of its own,
# with a name that differs from the builder name.
endpoint=""
if [ -n "${DOCKER_TLS_VERIFY:-}" ]; then
  docker context create tls-environment
  endpoint="tls-environment"
fi
docker buildx create --name ci --driver docker-container --use $endpoint

docker buildx bake -f compose.yaml -f compose.prod.yaml --push $overrides $targets
