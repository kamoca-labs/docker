---
name: ci
description: Creates the CI/CD of the Docker environment of the project in GitLab CI or GitHub Actions (prod image build, automatic deploy and rollback). It probes what the project has (image registry, runner that builds, SSH access to the server) and chooses the strategy that fits - registry, ssh-load, remote-build or server-build. Use when asked for CI, CD, a pipeline, a workflow, automatic deploy, a registry or a rollback for a project with docker/ and compose.prod.yaml.
argument-hint: "[registry|ssh-load|remote-build|server-build]"
---

# docker:ci

Not every place has an image registry, and not every runner can reach the server. So the skill **probes first**. Then it chooses how the image gets to the server. The strategy works for any forge. The templates cover GitLab CI and GitHub Actions. For another forge, translate the same strategy to its syntax.

## What the pipeline does with Docker

1. **Build.** The CI builds the prod image of each service from `docker/<domain>/Dockerfile`, with the target `prod`.
2. **Register.** The CI publishes each image as a package in the registry of the forge (GitLab Container Registry or GitHub `ghcr.io`), tagged with the commit SHA.
3. **Deploy.** The CI sends only two files to the server: `compose.yaml` and `compose.prod.yaml`. The `.env.prod` already lives on the server. The server runs `docker compose pull` and `up -d --no-build --wait` with `IMAGE_TAG` set to that SHA. The server never holds the code and never builds.

The tests, and the rule that the merge does not run them again, belong to the pipeline flow. Use `git:ci-cd` for that flow when the git plugin is installed.

Prerequisite: `compose.yaml`, `compose.prod.yaml` and `docker/<domain>/Dockerfile`. If they are missing, use `docker:create` or `docker:tune`. With an argument, skip the choice in step 3 and confirm it only with the probe.

## Steps

1. **Survey what exists.**
   - The forge: `git remote get-url origin` (`github.com` is GitHub. Anything else is GitLab, including a self-hosted instance).
   - The current CI: `.gitlab-ci.yml` or `.github/workflows/`. If it exists, add jobs and respect what is there. Never overwrite it.
   - The `docker/README.md` and the `compose.prod.yaml` (`REGISTRY`, `IMAGE_TAG`, `APP_NAME`).
2. **Probe.** Run the four probes and note the result of each one. Ask the user only what the probe does not answer.

   | Probe | GitLab | GitHub |
   |---|---|---|
   | Project registry | `container_registry_enabled` of the project (MCP, `glab api` or browser) | GHCR (`ghcr.io`) comes with the repository. Check that the organization allows packages and that the workflow can have `packages: write` |
   | Organization registry | `curl -sI https://<host>/v2/`: `401` or `200` means a registry. Search scripts and docs for `docker push` and `docker login`. With no clue, ask if Docker Hub, Harbor or another registry exists | The same. A registry of the organization is better than GHCR if the team already uses it |
   | Runner | List the runners of the project and run the `probe` job on each candidate tag | `ubuntu-latest` has Docker and BuildKit. List the self-hosted runners (`gh api repos/<owner>/<repo>/actions/runners`) and run the `probe` workflow |
   | Server | The `probe` job tests `ssh` to `DEPLOY_HOST` | The `probe` workflow tests port 22 and `ssh`. **A GitHub-hosted runner is on the internet.** A server in an internal network is reachable only by a self-hosted runner in the same network, or by VPN |

   The `probe` runs on a throwaway branch `ci/probe-docker`. Ask for approval, push the branch, read the log (`git:ci`) and delete only that branch.

   GitLab:

   ```yaml
   probe:
     tags: [<runner-tag>]
     script:
       - id
       - docker version --format '{{.Server.Version}}' || true
       - docker buildx version || true
       - docker compose version || true
       - ls -l /var/run/docker.sock || true
       - ssh -o BatchMode=yes -o ConnectTimeout=5 "$DEPLOY_HOST" 'docker compose version' || true
   ```

   GitHub (`.github/workflows/probe.yml`):

   ```yaml
   name: probe
   on:
     push:
       branches: [ci/probe-docker]
   jobs:
     probe:
       runs-on: <runner>
       env:
         DEPLOY_HOST: ${{ vars.DEPLOY_HOST }}
       steps:
         - run: |
             id
             docker version --format '{{.Server.Version}}' || true
             docker buildx version || true
             docker compose version || true
             timeout 5 bash -c "</dev/tcp/${DEPLOY_HOST#*@}/22" && echo port-22-ok || echo port-22-closed
             ssh -o BatchMode=yes -o ConnectTimeout=5 "$DEPLOY_HOST" 'docker compose version' || true
   ```

3. **Choose the strategy.** Use the first row of the table that the probe allows.

   | Strategy | When | How the image gets to the server |
   |---|---|---|
   | `registry` | A registry exists and the runner builds (Docker with BuildKit, or DinD) | The CI runs `build` and `push` with the SHA tag. The server runs `pull` |
   | `ssh-load` | No registry. The runner builds and reaches the server by SSH | `docker save \| gzip \| ssh <server> docker load` |
   | `remote-build` | No registry. The runner has only the Docker client, and the server has Docker | `DOCKER_HOST=ssh://<server> docker compose build`. The image is built on the server |
   | `server-build` | The runner has no Docker. The server has Docker, Git and read access to the repo | The server runs `git checkout <sha>` and `up --build` |

   In all strategies, the runner must reach the server by SSH. Without it, no strategy works. The probe shows what is missing (a self-hosted runner in the network of the server, or a VPN).

   GitLab runner with a Docker executor and no daemon: use DinD (the official `dind` image, in privileged mode) for `registry`. Kaniko and buildah do not read the compose file, so they need one job per service. Use them only on request of the user.

   Without a registry, a registry of your own (`registry:2` on the server) also works, but it needs TLS and a password. Use it only on request of the user.

   If no row fits, stop. Say what is missing and ask for a decision.
4. **Show the plan and wait for approval.** Use a short table with the forge, the probe, the strategy, the jobs, the variables and what each one changes on the server.
5. **Write the pipeline** from the template of the forge, next to this skill: `gitlab-ci.yaml` (becomes `.gitlab-ci.yml`) or `github-actions.yaml` (becomes `.github/workflows/deploy.yml`). Change the `build` job for the strategy (section below). Fill in the runners.
6. **Write `docker/deploy.sh`** from `deploy.template.sh` next to this skill, with the change for the strategy (table below). Update the section "Prod: deploy" of `docker/README.md` with the same flow. In the `registry` strategy, also write `docker/build.sh` from `build.template.sh`. Set `project` to the name in `compose.prod.yaml`. List one `<service>:<image>` pair for each distinct image (`docker compose -f compose.yaml -f compose.prod.yaml config --images` shows them).
7. **Variables.** Set the non-secret variables with the approval of the user: `DEPLOY_HOST` and `DEPLOY_PATH` (GitLab: project variables. GitHub: `gh variable set`). Claude does not set secrets (SSH key, deploy key, token). Give the user the variable name and where to set it. Prefer the access that already exists: the user of a self-hosted runner usually has the key of the server. On GitHub, a hosted runner needs the secret `DEPLOY_SSH_KEY` and the variable `DEPLOY_KNOWN_HOSTS`.
8. **Server.** The `.env.prod` of the server holds `REGISTRY` (in the `registry` strategy) and `APP_NAME`. Check that `compose.prod.yaml` resolves with `docker compose ... config`.
9. **Cleanup.** Apply the section "Cleanup" below, with the approval of the user.
10. **Prove it.** In the `registry` strategy, push a test branch. Only `build` runs, and the image appears in the registry with the SHA tag. In the other strategies, `build` runs only on the default branch. After the merge, confirm `deploy` with `docker compose ps` on the server (`healthy`) and the answer of the app. Report the link of the pipeline.

## `build` job by strategy

The build uses no secret. The job sets a dummy value for each `${VAR:?...}` of `compose.prod.yaml`.

`ssh-load` and `remote-build` write to the server. So their `build` runs only on the default branch and on manual trigger. The `build` of `registry` runs on every branch. The deploy runs only on the default branch and on manual trigger.

`registry` (already in the templates): login, then `sh docker/build.sh`. The script runs `docker buildx bake --push` and keeps the layer cache of each image in the registry (the `buildcache` tag), so the next build reuses the layers. It creates a `docker-container` builder, because the default builder cannot export a cache to a registry. Behind a dind service with TLS, it first creates a Docker context from the environment, with a name that differs from the builder name (a builder cannot share its name with a context). The `build` job does not need to wait for the test stage. Make `deploy` wait for `build` and for the tests. On GitHub, `REGISTRY` is `ghcr.io/<owner>/<repo>` in **lowercase**, and the template already converts it.

`ssh-load`: no `REGISTRY`. The compose file uses the default `local`.

```bash
$COMPOSE build
docker save $($COMPOSE config --images) | gzip | ssh "$DEPLOY_HOST" docker load
```

`remote-build`:

```bash
DOCKER_HOST="ssh://$DEPLOY_HOST" $COMPOSE build
```

`server-build`: no `build` job. The `deploy` job does everything.

## `deploy.sh` change by strategy

The template reads `REGISTRY_HOST`, `REGISTRY_USER` and `REGISTRY_TOKEN` from the environment of the job, so it does not depend on the forge. The pipeline templates already set all three with the token of the job.

| Strategy | Change in the template |
|---|---|
| `registry` | None. The template runs `login` with the token of the job, `pull` and `up --no-build` |
| `ssh-load` | Remove `login` and `pull` |
| `remote-build` | Remove `login` and `pull` |
| `server-build` | Replace `scp` with `git fetch origin && git checkout $sha` on the server, and replace `up` with `up -d --build --wait`. The server now holds code |

## Deploy

The deploy is **always automatic**: the `deploy` job runs on each merge to the default branch, after `build`. Never use `when: manual` on it (GitLab) or `environment` with approval (GitHub). The `--wait` of `deploy.sh` makes the job fail if a service does not become `healthy`. With a staging and a production environment, staging deploys on every merge and production deploys only by hand, with the target chosen in the manual trigger (`git:ci-cd` has the pipeline for it).

The deploy can also start by hand, and the path stays automatic:

| Forge | Manual trigger | Repeat the last deploy |
|---|---|---|
| GitLab | Build > Pipelines > **Run pipeline** on a branch or tag (`$CI_PIPELINE_SOURCE == "web"` in the `rules`) | **Retry** on the `deploy` job |
| GitHub | Actions > `deploy` > **Run workflow** on a branch or tag (`workflow_dispatch`) | **Re-run jobs** on the run |

The manual trigger runs `build` and `deploy` of the chosen ref, with no other click. On a branch that is not the default, it deploys that branch to production.

## Rollback

| Forge | How to go back |
|---|---|
| GitLab | **Rollback** button in Operate > Environments: it repeats the `deploy` job of the previous pipeline |
| GitHub | In Actions, open the run of the previous commit and use **Re-run all jobs**: it redoes `build` and `deploy` of that SHA |

Both copy the compose files of that SHA. The rollback goes back only as far as the image exists:

- `registry`: by the retention of the registry.
- `ssh-load` and `remote-build`: by the prune on the server (`until=168h` in `deploy.sh`).
- `server-build`: `up --build` rebuilds it.

Without the button, run `sh docker/deploy.sh <previous-sha>` in the checkout of that SHA.

## Cleanup

Only in the `registry` strategy.

**GitLab.** Project policy (`container_expiration_policy_attributes`, through the project API):

| Field | Value |
|---|---|
| `enabled` | `true` |
| `cadence` | `1d` |
| `keep_n` | `10` (tags per image) |
| `older_than` | `30d` |
| `name_regex_keep` | `(latest\|v[0-9].*)` |

The policy removes the tags. The space comes back only after the garbage collection of the registry. The GitLab administrator confirms if it runs by itself.

**GitHub.** GHCR has no retention policy of its own. Use the workflow `github-cleanup.yaml` next to this skill (becomes `.github/workflows/cleanup.yml`). It runs every week and keeps the 10 newest versions of each image. It does not touch `latest` or `v*`. Check the parameters of the action in the version you use.

On the server, `deploy.sh` prunes unused images older than 7 days.

## Out of scope

Orchestrator (Swarm, Kubernetes), staging environment, test and lint in the pipeline, and database migration in the deploy. Each one is a separate change.
