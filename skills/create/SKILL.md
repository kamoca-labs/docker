---
name: create
description: Creates the Docker environment of a project that has none. Dev in the root with hot reload and the host user. Lean prod in ./deploy with its own .env. Newest image versions. HTTP server with HTTP/2 and HTTP/3. Use to dockerize a project, or when asked for compose, a Dockerfile or a dev or prod environment from scratch.
argument-hint: "[dev|prod] [stack or services]"
---

# docker:create

First make it **work**, already inside the rules. Optimize later with `docker:tune`. Without an argument, create dev and prod.

Load each sub-skill with the `Skill` tool at the step where it applies. Load it only if the project needs it.

## Steps

1. **Survey the project.** Find the stack from the manifests and the lockfile. Find the dev command, the port and the services the code needs (database, cache, queue, e-mail). Decide if an HTTP server must sit in front (php-fpm always needs one. Static files, reverse proxy and HTTPS also need one). If Docker already exists, stop and use `docker:tune`.
2. **Rules and versions.** Load `docker:rules` and `docker:versions`. Look up the tag of each image on Docker Hub.
3. **Show the plan and wait for approval.** List the files, the services with the image and the tag you found, the ports and the variables with their defaults. Use a short table.
4. **Dev.** Load `docker:hot-reload`. Name the application service after the technology (`node`, `nuxt`, `php`). Use an official image for support services, with a `healthcheck` and data in `./.data/<service>`. Add `depends_on` with `condition: service_healthy` only where the app needs the service to be up.
5. **Prod.** Load `docker:prod-image`.
6. **HTTP server**, if there is one. Load `docker:https`, with the dev certificate and the prod simulation certificate.
7. **`.env` and `.gitignore`.** Put the generated `UID` and `GID` in `./.env` and the secrets in `deploy/.env`. In `.gitignore`, add `.env`, `deploy/.env`, `.data/`, `deploy/data/`, `certs/*.pem` and `deploy/certs/`.
8. **Make it work**, in this order. Fix problems until everything passes:
   - `docker compose config` checks the interpolation and shows the names.
   - `docker compose up -d --wait`: everything is `healthy` and the app answers.
   - Check hot reload and the owner of the folders (`docker:hot-reload`).
   - Check h2 and h3, if there is an HTTP server (`docker:https`).
   - `docker compose -f deploy/compose.yaml up -d --build --wait`.
9. **Report.** List the files, the commands to start dev and prod, and the `docker:measure` baseline (build, up and size of the prod image).

## Out of scope

Architecture optimization and build time optimization belong to `docker:tune`. CI, registry and orchestrator (Swarm, Kubernetes): only on request, in a separate change.
