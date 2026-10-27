# Using the `docker` plugin

## Contents

- [Dockerize a project](#dockerize-a-project)
- [Start dev and prod](#start-dev-and-prod)
- [Local HTTPS](#local-https)
- [Adjust and optimize](#adjust-and-optimize)
- [When a hook denies a write](#when-a-hook-denies-a-write)

## Dockerize a project

```
/docker:docker                     # routes by itself: without Docker, it creates. With Docker, it adjusts
/docker:create
/docker:create dev node with postgres and redis
```

Claude finds the stack, the port and the services, shows the plan and **waits for your approval**. Then it creates `compose.yaml` (dev), `deploy/` (prod), the two `.env` files (the dev one with your `UID`/`GID`), the data folders and the `.gitignore`. It starts everything, changes a file to confirm hot reload and reports the build time, the up time and the image size.

## Start dev and prod

```bash
docker compose up -d --wait                                # dev, reads ./.env
docker compose -f deploy/compose.yaml up -d --build --wait  # prod, reads deploy/.env
```

Each compose file reads the `.env` next to it. Dev and prod have different names (`dev-shop-*` and `shop-*`), so they run together on the same machine.

## Local HTTPS

```bash
./certs/generate.sh                 # dev: certs/cert.pem and certs/key.pem for localhost
./certs/generate.sh deploy/certs    # simulates prod. On the server, the real certificate is copied to deploy/certs/
```

nginx starts with HTTP/2 and HTTP/3. To check h3, curl must support it. The curl of the host usually does not, so `/docker:create` tests in a `debian:trixie-slim` container. The browser warns that the certificate is self-signed. Accept it once for `localhost`.

## Adjust and optimize

```
/docker:tune
/docker:tune up is slow
```

1. It starts the environment and fixes what does not become `healthy`.
2. It rewrites what breaks the rules. A named volume with data is copied to the local folder. It is removed only with your approval.
3. It measures the baseline, 3 times, as the median.
4. It makes one change at a time and measures again. The change stays if it gained 10% or more. Otherwise, it is reverted.
5. It shows a before and after table.

## When a hook denies a write

```
[docker:compose-name] The first key of the compose file must be `name:` with a value ...
[docker:service-name] Service with a generic name: app, db. Use the technology name ...
[docker:container-name] container_name must be the project name plus the service: postgres → ${COMPOSE_PROJECT_NAME}-postgres.
[docker:dev-user] Dev service that mounts a local folder with write access runs without the host user: postgres. ...
[docker:bind-volumes] Volume that does not point to a local folder: postgres: pgdata:/var/lib/postgresql. ...
[docker:single-env] .env.production: use one .env per environment: ./.env in dev and deploy/.env in prod.
[docker:var-defaults] Variable without a default: APP_PORT. Use ${APP_PORT:-value}. ...
[docker:deploy-folder] docker-compose.prod.yml: all prod files belong in ./deploy ...
[docker:http3] Server with TLS but without HTTP/2 and HTTP/3. Missing: listen 443 quic reuseport; http2 on; http3 on; ...
[docker:dockerignore] Dockerfile has no .dockerignore. First create Dockerfile.dockerignore next to it, ...
```

For a false positive, the case stays in `~/.claude/hook-cases.jsonl` and becomes a test in `hooks/tests/cases.json` (see [turn a real case into a test](https://github.com/kamoca-labs/marketplace/blob/main/USAGE.md)).
