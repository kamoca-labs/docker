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

A Docker environment with the same standard in every project. The flow is always **make it work first, inside the rules, and optimize with measurements only after that**. `/docker:docker` is the entry point. It looks at the project and routes to `/docker:create` (makes it work), `/docker:tune` (brings it to the rules and optimizes it) or `/docker:ci` (build and deploy in the CI). The hooks deny any write of a compose file that breaks the rules, so the standard holds even outside the skills.

## Commands

| Command | Arguments | What it does |
|---|---|---|
| `/docker:docker` | `[what you want]` | Single entry point. Without Docker in the project, it goes to create. With Docker, it goes to tune. For a CI or deploy request, it goes to ci. For a specific question, it loads only the sub-skill of the topic |
| `/docker:create` | `[dev\|prod] [stack or services]` | Images use the newest stable version, looked up on Docker Hub. It writes three compose files in the root (`compose.yaml` as the base, `compose.dev.yaml` and `compose.prod.yaml`) and one Dockerfile per service in `docker/<domain>`, the same for dev and prod. Dev has hot reload (mounted code, server in watch mode) and the host UID/GID in the `.env`. Prod is lean and has its own `.env.prod`. With an HTTP server, it adds nginx with HTTP/2 and HTTP/3 and `docker/nginx/certs/generate.sh` for the self-signed certificate. It writes `docker/README.md` with the dev and prod `up` commands, starts everything, checks hot reload and reports the baseline (build, up, size) |
| `/docker:tune` | `[focus]` | Makes the setup start, brings it to the rules (moves a named volume to a local folder, with confirmation), splits the compose file into base and difference with `compare-config.sh` (the diff of `docker compose config` must be empty), gathers the `up` documentation in `docker/README.md`, measures (cold and warm build, up, image, resources, latency, database) and tests one optimization at a time: layers, cache, healthcheck, PgBouncer, Redis, second database, proxy. Only what gained stays |
| `/docker:ci` | `[registry\|ssh-load\|remote-build\|server-build]` | Probes the project (image registry, runner that builds, SSH access to the server) and chooses the strategy that fits. `registry` builds and pushes with the SHA tag, and the server pulls. `ssh-load` needs no registry: the image goes through `docker save` and `docker load` over SSH. `remote-build` runs the build on the daemon of the server. `server-build` checks out the code on the server and builds there. It writes the pipeline (`.gitlab-ci.yml` or `.github/workflows/deploy.yml`) and `docker/deploy.sh`, with automatic deploy, manual trigger, rollback and registry cleanup |

### Sub-skills

They stay out of the `/` menu (`user-invocable: false`), but the model loads them with the `Skill` tool. Create and tune use the same ones, so each rule is written in one place.

| Skill | Topic |
|---|---|
| `docker:rules` | rules enforced by the hooks, the file layout and the split between base and environment |
| `docker:versions` | newest tag on Docker Hub and major version changes |
| `docker:hot-reload` | dev with hot reload and the host user |
| `docker:prod-image` | single multi-stage Dockerfile, dockerignore, prod compose and local prod test |
| `docker:https` | nginx with HTTP/2 and HTTP/3 and certificates |
| `docker:measure` | measurement of build, up, image, app and database |

## Rules

| Rule | Hook | Denies |
|---|---|---|
| Three compose files in the root, the rest in `docker/<domain>/` | `docker-folder` | a compose file outside the root or outside `compose.yaml`, `compose.dev.yaml` and `compose.prod.yaml` (`.yml` and `docker-compose*` too). A Dockerfile, ignore file, nginx config, certs or data outside `docker/<domain>/`. More than one Dockerfile per domain (`Dockerfile.dev`, `Dockerfile.prod`) |
| Every service has a Dockerfile | `service-build` | a service of `compose.yaml` without `build` for `docker/<domain>/Dockerfile`. An `image:` in dev |
| Project name first | `compose-name` | a dev or prod compose file whose first key is not `name:`. A dev compose file without the `dev-` prefix in `name`. A `name:` in the base |
| Service named after the technology | `service-name` | `app`, `db`, `api`, `web`, `backend`, `frontend` and other generic names. Use `node`, `nuxt`, `postgres`, `redis` |
| Container = project + service | `container-name` | a `container_name` that is not `${COMPOSE_PROJECT_NAME}-<service>`. In dev and prod, the rule applies only to a service that the base does not declare |
| Dev with the host user | `dev-user` | a dev service that mounts a local folder with write access without `user: "${UID:-1000}:${GID:-1000}"` (a `:ro` mount needs no user) |
| Volume in a local folder | `bind-volumes` | a named volume (in the service or at the top level), an anonymous volume or `type: volume` |
| One `.env` per environment | `single-env` | `.env.<anything>` except `.env.prod` and `.env.example`. An `env_file` that is not `.env` in dev or `.env.prod` in prod. An `env_file` in the base |
| Default in every parameter | `var-defaults` | `${VAR}` or `$VAR` without `:-default` or `:?error` |
| HTTP/2 and HTTP/3 | `http3` | an nginx conf with `listen ... ssl` and without `quic`, `http2 on`, `http3 on` or `Alt-Svc`. A service that publishes 443 without `443/udp` |
| Dockerignore without secrets or data | `dockerignore` | an ignore file without `**/.env`, `.env.prod`, `.git`, `**/data`, `**/certs`. A Dockerfile without an ignore file next to it |

The hooks run on `Write` and `Edit` (on `Edit`, they check the file as it is after the edit). The compose rules look only at `compose*.yaml` and `docker-compose*.yml`. The role of a compose file comes from its name: `compose.yaml` is the base, `compose.dev.yaml` is dev and `compose.prod.yaml` is prod. `single-env`, `docker-folder` and `dockerignore` also look at the name and the place of the file. The skills handle hot reload in dev, the lean image in prod and the newest image version (which needs a lookup on Docker Hub).

## Files

```
plugins/docker/
├── .claude-plugin/plugin.json
├── skills/docker/SKILL.md   hub: routes to create, tune or ci
├── skills/{create,tune,ci}/SKILL.md
├── skills/create/README.template.md   template of the docker/README.md of the project
├── skills/ci/gitlab-ci.yaml           template of .gitlab-ci.yml
├── skills/ci/github-actions.yaml      template of the GitHub deploy workflow
├── skills/ci/github-cleanup.yaml      template of the GHCR cleanup workflow
├── skills/ci/build.template.sh        template of docker/build.sh (registry strategy)
├── skills/ci/deploy.template.sh       template of docker/deploy.sh
├── skills/tune/compare-config.sh      snapshot and diff of docker compose config
├── skills/<topic>/SKILL.md  private sub-skills, shared
└── hooks/                   same structure as git: hooks.json, lib.ts, rules/, tests/
```
