---
name: prod-image
description: Single Dockerfile per service in docker/<domain> (stages base, dev, build and prod), dockerignore, prod compose with image and IMAGE_TAG, local prod test and signs of a slow image or build. Used by docker:create and docker:tune when they write or optimize prod.
user-invocable: false
---

# Production image

## Dockerfile (`docker/<domain>/Dockerfile`)

Use one Dockerfile per domain, for dev and prod. The stages:

| Stage | Content |
|---|---|
| `base` | official image in the version from `docker:versions`, user, system dependencies and lockfile. Dev and prod inherit from it |
| `dev` | `FROM base`, dev dependencies and the server in watch mode. The code comes mounted from `./` |
| `build` | `FROM base`, dependencies, code and artifact |
| `prod` | minimal runtime, only the artifact from `build` and a non-root `USER`. The healthcheck lives in `compose.yaml`, so dev and prod share it |

- Use multi-stage. `build` has the toolchain. `prod` has only the artifact.
- Use a `-alpine`, `-slim` or distroless base.
- Install only prod dependencies in `prod`. Copy and install the lockfile before the code, to use the layer cache.
- Use `RUN --mount=type=cache,target=<package manager cache>` for the package manager.

A third-party service (`postgres`, `redis`, `nginx`) has a minimal Dockerfile with the same stages, so `target` works in both environments.

```dockerfile
FROM postgres:18-alpine AS base
FROM base AS dev
FROM base AS prod
```

## Dockerignore (`docker/<domain>/Dockerfile.dockerignore`)

Write it **before** the Dockerfile (the hook denies a Dockerfile without an ignore file). BuildKit reads the ignore file next to the Dockerfile, so the root stays clean. Include at least `**/.env`, `.env.prod`, `.git`, `**/data` and `**/certs`, plus the dependencies and the build output of the stack (`node_modules`, `vendor`, `dist`, `.nuxt`). Without them, `COPY . .` puts secrets and certificates in the image, and the database data folder (with a different owner) breaks the build with `permission denied`.

## Prod compose (`compose.prod.yaml`)

Only the prod difference. The `build` comes from `compose.yaml`.

```yaml
name: ${APP_NAME:-shop}

services:
  node:
    image: ${REGISTRY:-local}/${APP_NAME:-shop}-node:${IMAGE_TAG:-latest}
    build:
      target: prod
    env_file:
      - path: .env.prod
        required: false
    restart: unless-stopped
    ports:
      - "${APP_PORT:-80}:3000"

  postgres:
    image: ${REGISTRY:-local}/${APP_NAME:-shop}-postgres:${IMAGE_TAG:-latest}
    build:
      target: prod
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-shop}
      POSTGRES_USER: ${DB_USER:-shop}
      POSTGRES_PASSWORD: ${DB_PASSWORD:?set DB_PASSWORD in .env.prod}
    volumes:
      - ./docker/postgres/data/prod:/var/lib/postgresql
```

- Do not mount code. Mount only the data volumes and the certificates.
- Set `image:` with the registry address and `IMAGE_TAG`. The same file then serves to build (`build`) and to pull (`pull`).
- For a secret with no safe default, use `${VAR:?set VAR in .env.prod}` and put the generated value in `.env.prod` (`openssl rand -hex 24`).

## Local prod test

This builds the prod image on your machine, with the same Dockerfile and the same `target` as the CI.

```bash
IMAGE_TAG=local docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod up -d --build --wait
```

- Use `IMAGE_TAG=local`, never `latest`. The local image then does not look like the image from the registry.
- Use a test `.env.prod`, with fake secrets. With an HTTP server, generate the simulation certificate: `docker/nginx/certs/generate.sh docker/nginx/certs/prod`.
- Never run `docker compose push` on the local machine.
- The local build is not bit-for-bit equal to the CI build. To prove the image from the registry, use `pull` and `up -d --no-build --wait` with `IMAGE_TAG=<sha>`.

On a server, start prod like this:

```bash
IMAGE_TAG=<sha> docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod up -d --no-build --wait
```

## Signs of a bad build or image

| Sign | Change |
|---|---|
| warm build as slow as the cold build | copy the lockfile and install before you copy the code |
| package download on every build | `RUN --mount=type=cache` |
| large build context (high `transferring context` in the build log) | complete the dockerignore with the dependencies and the build output of the stack |
| large prod image | smaller runtime, no dev dependencies, only the artifact |
