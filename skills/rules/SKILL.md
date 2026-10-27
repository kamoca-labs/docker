---
name: rules
description: Rules of the Docker environment (names, UID/GID in dev, volumes in a local folder, .env per environment, defaults, ./deploy, dockerignore, versions, HTTP/3, hot reload, lean prod) and the file layout. Used by docker:create and docker:tune. Load it before you write or review a compose file, a Dockerfile or an HTTP server config.
user-invocable: false
---

# Docker rules

The hooks of the plugin (`[docker:<rule>]`, one per rule) deny any write that breaks the table below. If a hook denies a write, fix the file. Never work around the hook (for example, by writing with `cat >` in the shell, or by renaming the file to avoid the name pattern).

| Rule | How | Enforced by |
|---|---|---|
| Project name first | `name:` is the first key of the compose file, before `services:`. Dev uses the prefix: `name: dev-${APP_NAME:-<folder>}`. Prod uses `name: ${APP_NAME:-<folder>}` | hook `compose-name` |
| Service named after the technology | `postgres`, `redis`, `node`, `nuxt`, `react`, `nginx`. Never `app`, `db`, `api`, `web`, `backend`, `frontend` | hook `service-name` |
| Container = project + service | `container_name: ${COMPOSE_PROJECT_NAME}-<service>`. Compose fills it with the `name:` | hook `container-name` |
| Dev with the host user | every dev service that mounts a local folder runs with `user: "${UID:-1000}:${GID:-1000}"`. The dev `.env` has `UID` and `GID` generated with `id -u` and `id -g` (the default 1000 is wrong for a domain user) | hook `dev-user` + `docker:hot-reload` |
| Volume always in a local folder | Use a bind mount. Dev uses `./.data/<service>`. Prod uses `${DATA_DIR:-./data}/<service>` (inside `deploy/`). No named or anonymous volumes | hook `bind-volumes` |
| One `.env` per environment | `./.env` in dev and `deploy/.env` in prod, both out of git. Each compose file reads the `.env` next to it (`env_file` with `path: .env` and `required: false`). No `.env.dev`, `.env.prod`, `.env.local` | hook `single-env` |
| Default in every parameter | `${VAR:-value}`. A prod secret with no safe value uses `${VAR:?set VAR in deploy/.env}` | hook `var-defaults` |
| Prod in `./deploy` | `deploy/compose.yaml`, `deploy/Dockerfile`, `deploy/Dockerfile.dockerignore`, `deploy/.env` and the proxy config, if there is one | hook `deploy-folder` |
| Dockerignore before the Dockerfile | every Dockerfile has an ignore file, with at least `**/.env`, `.git`, `.data` and `deploy/data`, plus the dependencies and the build output of the stack (`node_modules`, `vendor`, `dist`, `.nuxt`). Without it, `COPY . .` puts secrets in the image, and the database data folders break or bloat the build | hook `dockerignore` |
| Newest image version | the newest stable version of each technology, looked up on Docker Hub, never from memory (Postgres 18, not 16. PHP 8.5, not 8.2). See `docker:versions` | `docker:versions` |
| HTTP/2 and HTTP/3 | the HTTP server starts with TLS, `http2`, `http3` (QUIC) and `Alt-Svc`, and publishes 443 on TCP and UDP. See `docker:https` | hook `http3` + `docker:https` |
| Dev with hot reload | code mounted from `./` and the server in watch mode | `docker:hot-reload` |
| Lean and fast prod | multi-stage, minimal runtime, no mounted code | `docker:prod-image` |

With defaults everywhere and `required: false`, the compose file works without a `.env`. The `.env` only overrides values and keeps the secrets (and, in dev, `UID`/`GID`).

## Layout

```
.env                        dev: UID, GID and what overrides the defaults
compose.yaml                dev
Dockerfile                  dev, only if the official image with a command is not enough
.dockerignore               only if there is a dev Dockerfile
.data/                      dev volumes (in .gitignore)
nginx/default.conf.template dev, when there is an HTTP server
certs/
├── generate.sh             generates the self-signed certificate (in version control)
└── cert.pem, key.pem       generated (in .gitignore)
deploy/
├── compose.yaml            prod
├── Dockerfile              prod, multi-stage
├── Dockerfile.dockerignore BuildKit reads the ignore file next to the Dockerfile, so the root stays clean
├── .env                    prod: secrets and production values
├── nginx/default.conf.template
├── certs/                  cert.pem and key.pem copied here at deploy (in .gitignore)
└── data/                   prod volumes (in .gitignore)
```
