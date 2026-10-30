---
name: tune
description: Adjusts the Docker setup that already exists in the project. First it makes the setup start and brings it to the rules of the plugin (names, host UID/GID in dev, volumes in a local folder, one .env per environment, defaults, dockerignore, hot reload in dev, lean prod, compose split into base, dev and prod, one Dockerfile per service in docker/<domain>, docker/README.md). Then it optimizes with measurements of build time, up time, image size and application metrics, and tests one architecture change at a time (pooler, cache, second database, proxy). Use when the Docker environment is broken, slow, heavy or out of the standard.
argument-hint: "[focus: build, up, image, database, ...]"
---

# docker:tune

Work → rules → split → document → measure → change one thing → measure again → keep only what gained. Never optimize what does not start yet.

Load each sub-skill with the `Skill` tool at the step where it applies.

## 1. Make it work

Run `docker compose config` and `docker compose up -d --wait` with the compose files that the project already has, in dev and in prod (in the old layout: `compose.yaml` in the root and `deploy/compose.yaml`). For a service that does not become `healthy`, read `docker compose logs <service>`, find the root cause and fix it. Continue only when everything is up.

## 2. Rules

Load `docker:rules` and bring the existing files to the rules. The hooks deny any compose write that breaks the rules, so rewrite the old compose file completely. Do not patch it. What moves:

| Before | After |
|---|---|
| named volume with data | Stop the service. Copy the data to the local folder (`docker run --rm -v <volume>:/from -v ./docker/<service>/data/dev:/to alpine cp -a /from/. /to`). Point the bind mount to it. Check the data before you remove the volume. **Never** remove the volume without the confirmation of the user |
| `.env.dev`, `.env.production`, `deploy/.env` | `./.env` for dev and `./.env.prod` for prod, each one read by the `env_file` of the compose file of the environment |
| loose `image: postgres:16` in the compose file (service without a Dockerfile) | `docker/<service>/Dockerfile` with `FROM postgres:<version>` and `build` in `compose.yaml` |
| `Dockerfile.dev` and `Dockerfile.prod`, or two Dockerfiles | one `docker/<domain>/Dockerfile` with the stages `base`, `dev`, `build` and `prod` (`docker:prod-image`) |
| compose file with the extension `.yml` or `docker-compose*` | `compose.yaml`, `compose.dev.yaml` and `compose.prod.yaml` in the root |
| `app`, `db`, container without a name | service named after the technology (`node`, `postgres`) and `container_name: ${COMPOSE_PROJECT_NAME}-<service>`. Also change the host in the connection URLs (`@db:` becomes `@postgres:`) |
| dev running as root, root files in the folder | `user: "${UID:-1000}:${GID:-1000}"`, `UID`/`GID` generated in the `.env` and `sudo chown -R "$(id -u):$(id -g)" docker/*/data` (run `sudo` with the approval of the user) |
| Dockerfile without an ignore file, or with `.env` in the context | `Dockerfile.dockerignore` next to it, with `**/.env`, `.env.prod`, `.git`, `**/data`, `**/certs` and the dependencies of the stack |
| `docker-compose.prod.yml` in the root, or `deploy/compose.yaml` (old layout) | `compose.prod.yaml` in the root. Move `deploy/Dockerfile`, `deploy/data`, `deploy/certs` and `deploy/nginx` to `docker/<domain>/` (`data/prod`, `certs/prod`) |
| `.data/<service>` and `certs/` in the root | `docker/<service>/data/dev` and `docker/nginx/certs/dev` |
| dev without hot reload (code copied into the image) | `docker:hot-reload` |
| prod image with toolchain and dev dependencies | `docker:prod-image` |
| old image version (`postgres:16`, `php:8.2`) or `latest` | `docker:versions`, including the major version change of a database with data |
| nginx with TLS on HTTP/1.1 only, without `443/udp` | `docker:https` |

Start everything again (step 1) before you continue.

## 3. Split into base and difference

The compose file of each environment, already inside the rules, is still complete. Separate what is equal from what differs. Do not change the result.

1. Take a snapshot of the resolved configuration, with the files from before the split (for example, the complete `compose.dev.yaml` and `compose.prod.yaml`):

   ```bash
   DEV_ARGS="-f compose.dev.yaml" PROD_ARGS="-f compose.prod.yaml --env-file .env.prod" sh <folder of this skill>/compare-config.sh snapshot <temporary folder>/docker-snapshot
   ```

2. Compare key by key. What is equal in dev and prod goes to `compose.yaml`. What differs stays in `compose.dev.yaml` or in `compose.prod.yaml`. The `name:` stays in the files of the environment.
3. Compare with the snapshot. The diff must be **empty**:

   ```bash
   sh <folder of this skill>/compare-config.sh check <temporary folder>/docker-snapshot
   ```

   Any diff is an error of the split. Fix it and run the check again.

The script `compare-config.sh` is next to this skill, and the snapshot stays outside the repo. Without `DEV_ARGS` and `PROD_ARGS`, it uses the files of the new layout (`-f compose.yaml -f compose.dev.yaml` and `-f compose.yaml -f compose.prod.yaml --env-file .env.prod`).

## 4. Document the `up`

`docker/README.md` is the single place that tells how to start dev and prod.

1. Search for the `up` in `README*` and in `docs/*.md`.
2. Move the instructions to `docker/README.md`, in the format of the template `README.template.md` of `docker:create`, with dev and prod apart.
3. In the place they came from, leave one line with the link to `docker/README.md`.
4. Leave in place what is not `up`, such as the CI deploy flow in `docs/deploy.md`. Change only the old commands and paths.
5. If there is no documentation, write `docker/README.md` from scratch with the template.
6. Run each command of the README as written and confirm that it starts.

## 5. Measure

Take a baseline before any optimization, with `docker:measure`.

## 6. Optimize

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

## 7. Report

Show the before and after table from `docker:measure`. Below it, write one line per change: what you did, the gain, and which changes you reverted because they did not gain. If the project has no build and deploy pipeline, offer `docker:ci`.
