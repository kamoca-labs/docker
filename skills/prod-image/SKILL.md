---
name: prod-image
description: Lean and fast production image in ./deploy. Covers the multi-stage Dockerfile, the dockerignore, the prod compose file and the signs of a slow image or build. Used by docker:create and docker:tune when they write or optimize prod.
user-invocable: false
---

# Production image

## Dockerfile (`deploy/Dockerfile`)

- Use multi-stage. The build stage has the toolchain. The runtime stage has only the artifact.
- Use a `-alpine`, `-slim` or distroless base, in the version from `docker:versions`.
- Install only prod dependencies. Copy and install the lockfile before the code, to use the layer cache.
- Use `RUN --mount=type=cache,target=<package manager cache>` for the package manager.
- Add a non-root `USER` and a `HEALTHCHECK`.

## Dockerignore (`deploy/Dockerfile.dockerignore`)

Write it **before** the Dockerfile (the hook denies a Dockerfile without an ignore file). BuildKit reads the ignore file next to the Dockerfile, so the root stays clean. Include at least `**/.env`, `.git`, `.data`, `deploy/data`, `certs` and `deploy/certs`, plus the dependencies and the build output of the stack (`node_modules`, `vendor`, `dist`, `.nuxt`). Without them, `COPY . .` puts secrets and certificates in the image, and the database data folders break or bloat the build.

## Compose (`deploy/compose.yaml`)

Use `build: { context: .., dockerfile: deploy/Dockerfile }` and `restart: unless-stopped`. Do not mount code. Mount only the data volumes (`${DATA_DIR:-./data}/<service>`) and the certificates. For a secret with no safe default, use `${VAR:?set VAR in deploy/.env}` and put the generated value in `deploy/.env` (`openssl rand -hex 24`). Start it with `docker compose -f deploy/compose.yaml up -d --build --wait`. Compose reads `deploy/.env` by itself.

## Signs of a bad build or image

| Sign | Change |
|---|---|
| warm build as slow as the cold build | copy the lockfile and install before you copy the code |
| package download on every build | `RUN --mount=type=cache` |
| large build context (high `transferring context` in the build log) | complete the dockerignore with the dependencies and the build output of the stack |
| large prod image | smaller runtime, no dev dependencies, only the artifact |
