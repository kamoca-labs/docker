---
name: create
description: Creates the Docker environment of a project that has none. Base, dev and prod compose files in the root. One Dockerfile per service in docker/<domain>. Dev with hot reload and the host user. Lean prod with .env.prod. Newest image versions. HTTP server with HTTP/2 and HTTP/3. A docker/README.md with the dev and prod up. Use to dockerize a project, or when asked for compose, a Dockerfile or a dev or prod environment from scratch.
argument-hint: "[dev|prod] [stack or services]"
---

# docker:create

First make it **work**, already inside the rules. Optimize later with `docker:tune`. Without an argument, create dev and prod. With `dev`, create the base and dev.

Load each sub-skill with the `Skill` tool at the step where it applies. Load it only if the project needs it.

## Steps

1. **Survey the project.** Find the stack from the manifests and the lockfile. Find the dev command, the port and the services the code needs (database, cache, queue, e-mail). Decide if an HTTP server must sit in front (php-fpm always needs one. Static files, reverse proxy and HTTPS also need one). If Docker already exists, stop and use `docker:tune`.
2. **Rules and versions.** Load `docker:rules` and `docker:versions`. Look up the tag of each image on Docker Hub.
3. **Show the plan and wait for approval.** List the files, the services with the tag you found, the ports and the variables with their defaults. Use a short table.
4. **Base.** Write `compose.yaml` with what is equal in dev and prod. Write a `docker/<domain>/Dockerfile` with its `Dockerfile.dockerignore` for **every** service, including third-party services (`docker:production` has the template). Name each service after the technology (`node`, `nuxt`, `php`, `postgres`). Add `container_name` and `healthcheck`. Add `depends_on` with `condition: service_healthy` only where the app needs the service to be up.
5. **Dev.** Load `docker:development`. Write it in `compose.dev.yaml`.
6. **Prod.** Load `docker:production`. Write it in `compose.prod.yaml`.
7. **HTTP server**, if there is one. Load `docker:https`, with the dev certificate and the prod simulation certificate.
8. **`.env`, `.gitignore` and folders.** Put the generated `UID` and `GID` in `./.env` and the secrets in `./.env.prod` (`openssl rand -hex 24`). In `.gitignore`, add the lines from `docker:rules`. Create the folders `docker/<service>/data/dev` before the start.
9. **`docker/README.md`.** Copy the template `README.template.md`, which is next to this skill. Fill in the `<...>` markers (URL, ports, domains, secrets of `.env.prod`). Remove from the README what the project does not use, such as the certificate section when there is no HTTP server.
10. **Make it work**, in this order. Fix problems until everything passes:
    - `docker compose -f compose.yaml -f compose.dev.yaml config` and the same with `-f compose.prod.yaml --env-file .env.prod` check the interpolation and show the names.
    - The dev `up` of the README: everything is `healthy` and the app answers.
    - Check hot reload and the owner of the folders (`docker:development`).
    - Check h2 and h3, if there is an HTTP server (`docker:https`).
    - The local prod test of the README, with `IMAGE_TAG=local`.
    - Each command of `docker/README.md` runs as written.
11. **Report.** List the files, the commands to start dev and prod (the ones in `docker/README.md`), and the `docker:measure` baseline (build, up and size of the prod image).

## Out of scope

Architecture optimization and build time optimization belong to `docker:tune`. CI pipeline and registry belong to `docker:ci`, in a separate change. Orchestrator (Swarm, Kubernetes): only on request. The deploy sketch in the README is only a template.
