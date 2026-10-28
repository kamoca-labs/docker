# Docker

Dev and prod use the same Dockerfile for each service. The compose files stay in the root:

- `compose.yaml`: what is equal in dev and prod.
- `compose.dev.yaml`: only the dev difference.
- `compose.prod.yaml`: only the prod difference.

## 1. Dev: start

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d --wait
```

- App: <dev URL>.
- The `.env` holds the host `UID` and `GID`. Generate them with `id -u` and `id -g`.

See the logs:

```bash
docker compose -f compose.yaml -f compose.dev.yaml logs -f <service>
```

Stop:

```bash
docker compose -f compose.yaml -f compose.dev.yaml down
```

Rebuild after you change a Dockerfile:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d --build --wait
```

## 2. Prod: test locally

This builds the prod image on your machine, with the same Dockerfile as the CI.

1. Create a test `.env.prod` with fake secrets: <secrets of .env.prod>.
2. Generate the simulation certificate: <generate.sh command, or remove this step when there is no HTTP server>.
3. Start:

```bash
IMAGE_TAG=local docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod up -d --build --wait
```

4. Check: <test command, for example curl on the local prod URL>.
5. Stop:

```bash
IMAGE_TAG=local docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod down
```

Warning: never run `docker compose push` on the local machine. Only the CI publishes images.

## 3. Prod: start

On the server, with the real `.env.prod` and the tag of the commit that the CI published.

```bash
export IMAGE_TAG=<sha>
```

Pull the images:

```bash
docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod pull
```

Start without a build:

```bash
docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod up -d --no-build --wait
```

The server needs `docker login <registry>` with a read token. Do it once.

## 4. Prod: deploy

Sketch of `deploy.sh`. The CI publishes `<registry>/<project>-<service>:<sha>` before it calls the script.

```bash
#!/bin/sh
set -eu

sha="${1:?pass the SHA}"
host="${DEPLOY_HOST:?}"
dir="${DEPLOY_PATH:?}"
compose="docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod"

scp compose.yaml compose.prod.yaml "$host:$dir/"
ssh "$host" "cd $dir \
  && export IMAGE_TAG=$sha \
  && $compose pull \
  && $compose up -d --no-build --wait \
  && docker image prune -af --filter 'until=168h'"
```

Rollback: run the same script, on the checkout of the previous SHA, so the compose files go back together with the image.

```bash
sh deploy.sh <previous-sha>
```

The server receives no code. `<DEPLOY_PATH>` holds only `compose.yaml` and `compose.prod.yaml` (copied by the script, from the same SHA as the image), the `.env.prod` (outside git) and the state folders (`docker/<service>/data/prod`, `docker/nginx/certs/prod`).

## 5. Reference

### The `docker/` folder

| Folder | Content |
|---|---|
| `<domain>` | <Dockerfile and anything else> |

### Add a service

1. Create `docker/<service>/Dockerfile` with `FROM <image>:<version>`.
2. Create `docker/<service>/Dockerfile.dockerignore` with `**/.env`, `.env.prod`, `.git`, `**/data` and `**/certs`.
3. Declare the service with `build` in `compose.yaml`.
4. Add to `compose.dev.yaml` and to `compose.prod.yaml` only what differs.

### Certificate

Dev:

```bash
docker/nginx/certs/generate.sh docker/nginx/certs/dev
```

Prod: copy `cert.pem` (with the full chain) and `key.pem` to `docker/nginx/certs/prod/`.
