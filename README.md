# Plugin `docker`

## Contents

- [Installation](#installation)
- [Overview](#overview)
- [Commands](#commands)
- [Rules](#rules)
- [Files](#files)
- [Use cases](USAGE.md)

## Installation

```bash
claude plugin marketplace add kamoca-labs/marketplace
claude plugin install docker@kamoca
```

Requires Node 22.18+. The commands appear in the next session.

## Overview

A Docker environment with the same standard in every project. The flow is always **make it work first, inside the rules, and optimize with measurements only after that**. `/docker:docker` is the entry point. It looks at the project and routes to `/docker:create` (makes it work) or `/docker:tune` (brings it to the rules and optimizes it). The hooks deny any write of a compose file that breaks the rules, so the standard holds even outside the skills.

## Commands

| Command | Arguments | What it does |
|---|---|---|
| `/docker:docker` | `[what you want]` | Single entry point. Without Docker in the project, it goes to create. With Docker, it goes to tune. For a specific question, it loads only the sub-skill of the topic |
| `/docker:create` | `[dev\|prod] [stack or services]` | Images use the newest stable version, looked up on Docker Hub. Dev is in the root with hot reload (mounted code, server in watch mode) and the host UID/GID generated in the `.env`. Prod is in `./deploy`, with its own `.env` and a lean multi-stage image. With an HTTP server, it adds nginx with HTTP/2 and HTTP/3, `certs/generate.sh` for the self-signed certificate and `deploy/certs/` to receive the certificate at deploy. It starts everything, checks hot reload and reports the baseline (build, up, size) |
| `/docker:tune` | `[focus]` | Makes the setup start, brings it to the rules (moves a named volume to a local folder, with confirmation), measures (cold and warm build, up, image, resources, latency, database) and tests one optimization at a time: layers, cache, healthcheck, PgBouncer, Redis, second database, proxy. Only what gained stays |

### Sub-skills

They stay out of the `/` menu (`user-invocable: false`), but the model loads them with the `Skill` tool. Create and tune use the same ones, so each rule is written in one place.

| Skill | Topic |
|---|---|
| `docker:rules` | rules enforced by the hooks and the file layout |
| `docker:versions` | newest tag on Docker Hub and major version changes |
| `docker:hot-reload` | dev with hot reload and the host user |
| `docker:prod-image` | multi-stage Dockerfile, dockerignore and prod compose |
| `docker:https` | nginx with HTTP/2 and HTTP/3 and certificates |
| `docker:measure` | measurement of build, up, image, app and database |

## Rules

| Rule | Hook | Denies |
|---|---|---|
| Project name first | `compose-name` | a compose file whose first key is not `name:`. A dev compose file without the `dev-` prefix in `name` |
| Service named after the technology | `service-name` | `app`, `db`, `api`, `web`, `backend`, `frontend` and other generic names. Use `node`, `nuxt`, `postgres`, `redis` |
| Container = project + service | `container-name` | a `container_name` that is not `${COMPOSE_PROJECT_NAME}-<service>` |
| Dev with the host user | `dev-user` | a dev service that mounts a local folder with write access without `user: "${UID:-1000}:${GID:-1000}"` (a `:ro` mount needs no user) |
| Volume in a local folder | `bind-volumes` | a named volume (in the service or at the top level), an anonymous volume or `type: volume` |
| One `.env` per environment | `single-env` | `.env.<anything>` (except `.env.example`) and an `env_file` that is not the `.env` next to the compose file |
| Default in every parameter | `var-defaults` | `${VAR}` or `$VAR` without `:-default` or `:?error` |
| Prod in `./deploy` | `deploy-folder` | a compose file or Dockerfile with `prod` in the name outside `deploy/` |
| HTTP/2 and HTTP/3 | `http3` | an nginx conf with `listen ... ssl` and without `quic`, `http2 on`, `http3 on` or `Alt-Svc`. A service that publishes 443 without `443/udp` |
| Dockerignore without secrets or data | `dockerignore` | an ignore file without `**/.env`, `.git`, `.data`, `deploy/data`. A Dockerfile without an ignore file next to it |

The hooks run on `Write` and `Edit` (on `Edit`, they check the file as it is after the edit). The compose rules look only at `compose*.yaml` and `docker-compose*.yml`. `single-env`, `deploy-folder` and `dockerignore` also look at the name and the place of the file. A compose file inside `deploy/` is prod. Outside it, the file is dev. The skills handle hot reload in dev, the lean image in prod and the newest image version (which needs a lookup on Docker Hub).

## Files

```
plugins/docker/
├── .claude-plugin/plugin.json
├── skills/docker/SKILL.md   hub: routes to create or tune
├── skills/{create,tune}/SKILL.md
├── skills/<topic>/SKILL.md  private sub-skills, shared
└── hooks/                   same structure as git: hooks.json, lib.ts, rules/, tests/
```
