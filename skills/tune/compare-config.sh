#!/bin/sh
set -eu

mode="${1:?use: compare-config.sh snapshot|check <folder>}"
dir="${2:?use: compare-config.sh snapshot|check <folder>}"
dev_args="${DEV_ARGS:--f compose.yaml -f compose.dev.yaml}"
prod_args="${PROD_ARGS:--f compose.yaml -f compose.prod.yaml --env-file .env.prod}"

render() {
  # shellcheck disable=SC2086
  docker compose $2 config > "$1"
}

mkdir -p "$dir"

case "$mode" in
  snapshot)
    render "$dir/dev.yaml" "$dev_args"
    render "$dir/prod.yaml" "$prod_args"
    echo "snapshot saved in $dir"
    ;;
  check)
    render "$dir/dev.after.yaml" "$dev_args"
    render "$dir/prod.after.yaml" "$prod_args"
    status=0
    diff -u "$dir/dev.yaml" "$dir/dev.after.yaml" || status=1
    diff -u "$dir/prod.yaml" "$dir/prod.after.yaml" || status=1
    [ "$status" -eq 0 ] && echo "dev and prod identical to the snapshot"
    exit "$status"
    ;;
  *)
    echo "use: compare-config.sh snapshot|check <folder>" >&2
    exit 2
    ;;
esac
