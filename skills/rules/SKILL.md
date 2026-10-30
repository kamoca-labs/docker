---
name: rules
description: Rules of the Docker environment (names, base, dev and prod compose files in the root, a single Dockerfile per service in docker/<domain>, UID/GID in dev, volumes in a local folder, .env per environment, defaults, dockerignore, versions, HTTP/3, hot reload, lean prod, docker README) and the file layout. Used by docker:create and docker:tune. Load it before you write or review a compose file, a Dockerfile or an HTTP server config.
user-invocable: false
---

# Docker rules

The hooks of the plugin (`[docker:<rule>]`, one per rule) deny any write that breaks the table below. If a hook denies a write, fix the file. Never work around the hook (for example, by writing with `cat >` in the shell, or by renaming the file to avoid the name pattern).

| Rule | How | Enforced by |
|---|---|---|
| Three compose files in the root | `compose.yaml` (base, what is equal in dev and prod), `compose.dev.yaml` and `compose.prod.yaml` (only the difference). Use the `.yaml` extension. No `docker-compose*` and no compose file outside the root | hook `docker-folder` |
| The rest of Docker in `docker/<domain>/` | The Dockerfile, the dockerignore, the configuration, the data and the certificates stay in the folder of the domain (`docker/backend`, `docker/nginx`, `docker/postgres`) | hook `docker-folder` |
| Project name first | `name:` is the first key of the dev compose file and of the prod compose file. Dev uses the prefix: `name: dev-${APP_NAME:-<folder>}`. Prod uses `name: ${APP_NAME:-<folder>}`. The base has no `name:`. If the app sets `APP_NAME` in the same `.env` (Laravel does, with a display name), the project and image names become invalid. Then write a literal name: `name: dev-shop`, `name: shop` and `shop-node` | hook `compose-name` |
| Service named after the technology | `postgres`, `redis`, `node`, `nuxt`, `react`, `nginx`. Never `app`, `db`, `api`, `web`, `backend`, `frontend`. The folder of the domain can be `backend`. Its service cannot | hook `service-name` |
| Container = project + service | `container_name: ${COMPOSE_PROJECT_NAME}-<service>`, declared once in `compose.yaml` | hook `container-name` |
| Single image | one `docker/<domain>/Dockerfile` per domain, with no `Dockerfile.dev` or `Dockerfile.prod`. The stages are `base`, `dev`, `build` and `prod`. The dev compose file uses `target: dev` and the prod compose file uses `target: prod` | hook `docker-folder` + `docker:prod-image` |
| Every service has a Dockerfile | every service of `compose.yaml` declares `build`, even a third-party one (`postgres`, `redis`, `nginx`). The minimal Dockerfile has one `FROM`. Only prod declares `image:` | hook `service-build` |
| Dev with the host user | every dev service that mounts a local folder with write access runs with `user: "${UID:-1000}:${GID:-1000}"`. The dev `.env` has `UID` and `GID` generated with `id -u` and `id -g` (the default 1000 is wrong for a domain user) | hook `dev-user` + `docker:hot-reload` |
| Volume always in a local folder | Use a bind mount: `docker/<service>/data/dev` in dev and `docker/<service>/data/prod` in prod. No named or anonymous volumes | hook `bind-volumes` |
| One `.env` per environment | `./.env` in dev and `./.env.prod` in prod, both out of git. The `env_file` stays in the compose file of the environment: `.env` in dev and `.env.prod` in prod, with `required: false`. The base declares no `env_file`. No `.env.dev`, `.env.production`, `.env.local` | hook `single-env` |
| Default in every parameter | `${VAR:-value}`. A prod secret with no safe value uses `${VAR:?set VAR in .env.prod}` | hook `var-defaults` |
| Dockerignore before the Dockerfile | every Dockerfile has an ignore file next to it, with at least `**/.env`, `.env.prod`, `.git`, `**/data` and `**/certs`, plus the dependencies and the build output of the stack (`node_modules`, `vendor`, `dist`, `.nuxt`). Without it, `COPY . .` puts secrets in the image, and the database data folder breaks or bloats the build | hook `dockerignore` |
| Newest image version | the newest stable version of each technology, looked up on Docker Hub, never from memory, written in the `FROM` of the Dockerfile (Postgres 18, not 16. PHP 8.5, not 8.2). See `docker:versions` | `docker:versions` |
| HTTP/2 and HTTP/3 | the HTTP server starts with TLS, `http2`, `http3` (QUIC) and `Alt-Svc`, and publishes 443 on TCP and UDP. See `docker:https` | hook `http3` + `docker:https` |
| Dev with hot reload | code mounted from `./` and the server in watch mode | `docker:hot-reload` |
| Lean and fast prod | multi-stage, minimal runtime, no mounted code | `docker:prod-image` |
| How to start, documented | `docker/README.md` with the dev `up`, the local prod test, the prod `up` and the deploy | `docker:create` and `docker:tune` |

With defaults everywhere and `required: false`, the compose file works without a `.env`. The `.env` only overrides values and keeps the secrets (and, in dev, `UID`/`GID`).

## Layout

```
compose.yaml                base: what is equal in dev and prod, without name:
compose.dev.yaml            dev: only the difference
compose.prod.yaml           prod: only the difference
.env                        dev: UID, GID and what overrides the defaults
.env.prod                   prod: secrets and production values
docker/
├── README.md               how to start dev and prod (template in docker:create)
├── backend/
│   ├── Dockerfile          single, multi-stage: base → dev, base → build → prod
│   └── Dockerfile.dockerignore
├── nginx/
│   ├── Dockerfile          minimal: FROM nginx:<version>
│   ├── Dockerfile.dockerignore
│   ├── default.conf.template
│   └── certs/
│       ├── generate.sh     generates the self-signed certificate (in version control)
│       ├── dev/            generated cert.pem and key.pem (in .gitignore)
│       └── prod/           cert.pem and key.pem of the server (in .gitignore)
└── postgres/
    ├── Dockerfile          minimal: FROM postgres:<version>
    ├── Dockerfile.dockerignore
    └── data/
        ├── dev/            dev volume (in .gitignore)
        └── prod/           prod volume (in .gitignore)
```

Every service of the compose file has a folder and a Dockerfile.

## Split between base and environment

What is equal in dev and prod goes to `compose.yaml`. Only the difference stays in the file of the environment.

```yaml
services:
  node:
    container_name: ${COMPOSE_PROJECT_NAME}-node
    build:
      context: .
      dockerfile: docker/backend/Dockerfile
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    container_name: ${COMPOSE_PROJECT_NAME}-postgres
    build:
      context: docker/postgres
      dockerfile: Dockerfile
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER}"]
      interval: 5s
      start_period: 10s
```

- A service with code (`backend`, `frontend`) uses `context: .` and `dockerfile: docker/<domain>/Dockerfile`.
- A service without code (`postgres`, `redis`, `nginx`) uses `context: docker/<domain>` and `dockerfile: Dockerfile`, so the build does not send the whole project. The `dockerfile` is relative to the `context`.
- The base holds the whole architecture: every service and every replica, with `restart`, `depends_on`, `healthcheck`, `command` and `entrypoint`. Dev adds only `target: dev`, the mounts, the host user and the direct ports. So a bug in a replica, in the proxy or in a reader shows up in dev before the deploy.
- Services that repeat the same keys (replicas, or services with the same role) share them through a YAML anchor: `x-<name>: &<name>` at the top of the file, and `<<: *<name>` in each service.
- The dev file, the prod file and the `.gitignore` change name and place with the layout. The sections `docker:hot-reload` and `docker:prod-image` show the file of each environment.

## `.gitignore`

```
.env
.env.prod
docker/*/data/
docker/*/certs/dev/
docker/*/certs/prod/
```
