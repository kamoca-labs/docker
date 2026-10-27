---
name: tune
description: Adjusts the Docker setup that already exists in the project. First it makes the setup start and brings it to the rules of the plugin (names, host UID/GID in dev, volumes in a local folder, one .env per environment, defaults, dockerignore, hot reload in dev, lean prod in ./deploy). Then it optimizes with measurements of build time, up time, image size and application metrics, and tests one architecture change at a time (pooler, cache, second database, proxy). Use when the Docker environment is broken, slow, heavy or out of the standard.
argument-hint: "[focus: build, up, image, database, ...]"
---

# docker:tune

Work → rules → measure → change one thing → measure again → keep only what gained. Never optimize what does not start yet.

Load each sub-skill with the `Skill` tool at the step where it applies.

## 1. Make it work

Run `docker compose config`, `docker compose up -d --wait` and the same with `-f deploy/compose.yaml`. For a service that does not become `healthy`, read `docker compose logs <service>`, find the root cause and fix it. Continue only when everything is up.

## 2. Rules

Load `docker:rules` and bring the existing files to the rules. The hooks deny any compose write that breaks the rules, so rewrite the old compose file completely. Do not patch it. What moves:

| Before | After |
|---|---|
| named volume with data | Stop the service. Copy the data to the local folder (`docker run --rm -v <volume>:/from -v ./.data/<service>:/to alpine cp -a /from/. /to`). Point the bind mount to it. Check the data before you remove the volume. **Never** remove the volume without the confirmation of the user |
| `.env.dev`, `.env.prod` | `./.env` for dev and `deploy/.env` for prod |
| `app`, `db`, container without a name | service named after the technology (`node`, `postgres`) and `container_name: ${COMPOSE_PROJECT_NAME}-<service>`. Also change the host in the connection URLs (`@db:` becomes `@postgres:`) |
| dev running as root, root files in the folder | `user: "${UID:-1000}:${GID:-1000}"`, `UID`/`GID` generated in the `.env` and `sudo chown -R "$(id -u):$(id -g)" .data` (run `sudo` with the approval of the user) |
| Dockerfile without an ignore file, or with `.env` in the context | ignore file with `**/.env`, `.git`, `.data`, `deploy/data` and the dependencies of the stack |
| `docker-compose.prod.yml` in the root | `deploy/compose.yaml` with `context: ..` |
| dev without hot reload (code copied into the image) | `docker:hot-reload` |
| prod image with toolchain and dev dependencies | `docker:prod-image` |
| old image version (`postgres:16`, `php:8.2`) or `latest` | `docker:versions`, including the major version change of a database with data |
| nginx with TLS on HTTP/1.1 only, without `443/udp` | `docker:https` |

Start everything again (step 1) before you measure.

## 3. Measure

Take a baseline before any optimization, with `docker:measure`.

## 4. Optimize

Make one change at a time. After each change, start the environment (step 1), measure (`docker:measure`) and compare. If the gain is clear (10% or more on the measurement that the change targets, and no other measurement gets worse), keep the change. If it does not gain, revert it.

### Build and image

The signs and the changes are in `docker:prod-image`.

### Up

| Sign | Change |
|---|---|
| the app waits for the database longer than needed | `healthcheck` with a short `start_interval` and a realistic `interval` |
| a service waits for another service that it does not depend on | remove the `depends_on` |
| migration or installation on the start path in prod | move it to the build or to a one-shot service |

### Architecture

Change it only with a sign in the measurements. A new service follows the same rules (technology name, container with the project name, `user` in dev, volume in a local folder, default, `.env` of the environment).

| Sign | Change |
|---|---|
| many open connections, long connect time, `too many connections` | PgBouncer in `transaction` mode (ProxySQL for MySQL) between the app and the database |
| the same query repeated, session or queue in the database | Redis for cache, session or queue |
| heavy reads blocking writes | second database: a read replica where the app splits reads and writes, or one database per domain when the data does not cross |
| the app serves static files | nginx or Caddy in front, serving `public/` |
| app CPU at the limit with one process | more workers (php-fpm `pm.max_children`, gunicorn `--workers`, Node cluster) before more replicas |

## 5. Report

Show the before and after table from `docker:measure`. Below it, write one line per change: what you did, the gain, and which changes you reverted because they did not gain.
