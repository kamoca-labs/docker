# Using the `docker` plugin

## Contents

- [Dockerize a project](#dockerize-a-project)
- [Start dev and prod](#start-dev-and-prod)
- [Local HTTPS](#local-https)
- [Adjust and optimize](#adjust-and-optimize)
- [CI/CD in GitLab or GitHub](#cicd-in-gitlab-or-github)
- [When a hook denies a write](#when-a-hook-denies-a-write)

## Dockerize a project

```
/docker:docker                     # routes by itself: without Docker, it creates. With Docker, it adjusts
/docker:create
/docker:create dev node with postgres and redis
```

Claude finds the stack, the port and the services, shows the plan and **waits for your approval**. Then it creates `compose.yaml` (base), `compose.dev.yaml` and `compose.prod.yaml` in the root, one Dockerfile per service in `docker/<domain>/`, the two `.env` files (`.env` with your `UID`/`GID`, and `.env.prod`), the data folders, the `.gitignore` and `docker/README.md`. It starts everything, changes a file to confirm hot reload and reports the build time, the up time and the image size.

## Start dev and prod

Dev:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d --wait
```

Local prod test (it builds the image on your machine and does not publish it):

```bash
IMAGE_TAG=local docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod up -d --build --wait
```

Prod on the server (image from the registry, no build):

```bash
IMAGE_TAG=<sha> docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod up -d --no-build --wait
```

Dev reads `./.env` and prod reads `./.env.prod`. Dev and prod have different names (`dev-shop-*` and `shop-*`), so they run together on the same machine. The `docker/README.md` of each project has these commands, the deploy outline and the rollback.

## Local HTTPS

```bash
docker/nginx/certs/generate.sh docker/nginx/certs/dev    # dev: cert.pem and key.pem for localhost
docker/nginx/certs/generate.sh docker/nginx/certs/prod   # simulates prod. On the server, the real certificate is copied to docker/nginx/certs/prod/
```

nginx starts with HTTP/2 and HTTP/3. To check h3, curl must support it. The curl of the host usually does not, so `/docker:create` tests in a `debian:trixie-slim` container. The browser warns that the certificate is self-signed. Accept it once for `localhost`.

## Adjust and optimize

```
/docker:tune
/docker:tune up is slow
```

1. It starts the environment and fixes what does not become `healthy`.
2. It rewrites what breaks the rules. A named volume with data is copied to the local folder. It is removed only with your approval.
3. It splits the compose file into base and difference, and checks that `docker compose config` for dev and for prod stays identical to the one before.
4. It gathers the `up` instructions in `docker/README.md`.
5. It measures the baseline, 3 times, as the median.
6. It makes one change at a time and measures again. The change stays if it gained 10% or more. Otherwise, it is reverted.
7. It shows a before and after table.

## CI/CD in GitLab or GitHub

```
/docker:ci
/docker:ci ssh-load
```

Not every place has an image registry, so Claude probes before it chooses:

| Probe | What it answers |
|---|---|
| registry of the project and of the organization | whether there is a place to publish the image |
| `probe` job on a disposable branch | runner executor, Docker, BuildKit and SSH to the server |
| server | Docker, Compose v2 and access. On GitHub, the hosted runner is on the internet. A server on an internal network needs a self-hosted runner on the same network, or a VPN |

With the result, Claude shows the strategy and **waits for your approval**. Then it writes the pipeline of the forge (`.gitlab-ci.yml` or `.github/workflows/deploy.yml`) and `docker/deploy.sh`, adjusts the deploy section of `docker/README.md` and applies the registry cleanup. The deploy is automatic on each merge to the default branch. You can also trigger it by hand (Run pipeline in GitLab, Run workflow in GitHub). Claude does not register secrets (an SSH key, a deploy key). It tells you the name of the variable and where to register it. The rollback is the **Rollback** button in Operate > Environments (GitLab), or **Re-run all jobs** on the run of the previous commit (GitHub).

## When a hook denies a write

```
[docker:compose-name] The first key of the compose file must be `name:` with a value ...
[docker:service-name] Service with a generic name: app, db. Use the technology name ...
[docker:container-name] container_name must be the project name plus the service: postgres → ${COMPOSE_PROJECT_NAME}-postgres.
[docker:dev-user] Dev service that mounts a local folder with write access runs without the host user: postgres. ...
[docker:bind-volumes] Volume that does not point to a local folder: postgres: pgdata:/var/lib/postgresql. ...
[docker:single-env] .env.production: use one .env per environment: ./.env in dev and ./.env.prod in prod.
[docker:var-defaults] Variable without a default: APP_PORT. Use ${APP_PORT:-value}. ...
[docker:docker-folder] deploy/compose.yaml: the compose file belongs in the project root (compose.yaml). Put the rest of Docker in docker/<domain>/.
[docker:service-build] Give every service in the base file a build that resolves to docker/<domain>/Dockerfile. This includes third-party services ... Services without a valid build: postgres.
[docker:http3] Server with TLS but without HTTP/2 and HTTP/3. Missing: listen 443 quic reuseport; http2 on; http3 on; ...
[docker:dockerignore] Dockerfile has no .dockerignore. First create Dockerfile.dockerignore next to it, ...
```

For a false positive, the case stays in `~/.claude/hook-cases.jsonl` and becomes a test in `hooks/tests/cases.json` (see [turn a real case into a test](https://github.com/kamoca-labs/marketplace/blob/main/USAGE.md#turn-a-real-case-into-a-test)).
