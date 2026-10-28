---
name: ci
description: Creates the CI/CD of the project Docker environment on GitLab CI or GitHub Actions (prod image build, automatic deploy and rollback). Probes what the project has (image registry, build runner, SSH access to the server) and picks the fitting strategy: registry, ssh-load, remote-build or server-build. Use when asked for CI, CD, a pipeline, a workflow, automatic deploy, a registry or a rollback in a project with docker/ and compose.prod.yaml.
argument-hint: "[registry|ssh-load|remote-build|server-build]"
---

# docker:ci

Not every place has an image registry, and not every runner reaches the server. So this skill **probes first**. Then it chooses how the image reaches the server. The strategy is valid for any forge. The models cover GitLab CI and GitHub Actions. For another forge, translate the same strategy to its syntax.

Prerequisite: `compose.yaml`, `compose.prod.yaml` and `docker/<domain>/Dockerfile`. If they are missing, use `docker:create` or `docker:tune`. With an argument, skip the choice in step 3 and confirm it only with the probe.

## Steps

1. **Survey what exists.**
   - The forge: `git remote get-url origin` (`github.com` is GitHub. Anything else is GitLab, a self-hosted instance included).
   - The current CI: `.gitlab-ci.yml` or `.github/workflows/`. If it exists, add jobs and respect what is there. Never overwrite it.
   - `docker/README.md` and `compose.prod.yaml` (`REGISTRY`, `IMAGE_TAG`, `APP_NAME`).
2. **Probe.** Run the four probes and note the result of each one. Ask the user only what the probe does not answer.

   | Probe | GitLab | GitHub |
   |---|---|---|
   | Project registry | `container_registry_enabled` of the project (MCP, `glab api` or browser) | GHCR (`ghcr.io`) comes with the repository. Check that the organization allows packages and that the workflow can have `packages: write` |
   | Organization registry | `curl -sI https://<host>/v2/`: `401` or `200` means a registry. Search scripts and docs for `docker push` and `docker login`. With no hint, ask if there is Docker Hub, Harbor or another one | The same. An organization registry is better than GHCR, if the team already uses it |
   | Runner | list the runners of the project and run the `probe` job on each candidate tag | `ubuntu-latest` has Docker and BuildKit. List the self-hosted runners (`gh api repos/<owner>/<repo>/actions/runners`) and run the `probe` workflow |
   | Server | the `probe` job tests `ssh` to `DEPLOY_HOST` | the `probe` workflow tests port 22 and `ssh`. **A GitHub-hosted runner is on the internet.** A server on an internal network is reachable only by a self-hosted runner on the same network, or by VPN |

   The `probe` runs on a disposable branch `ci/probe-docker`. Ask for approval, push the branch, read the log (`git:ci`) and delete only that branch.

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

   | Strategy | When | How the image reaches the server |
   |---|---|---|
   | `registry` | there is a registry and the runner builds (Docker with BuildKit, or DinD) | the CI runs `build` and `push` with the SHA tag. The server runs `pull` |
   | `ssh-load` | no registry, and the runner builds and reaches the server by SSH | `docker save \| gzip \| ssh <server> docker load` |
   | `remote-build` | no registry, the runner has only the Docker client, and the server has Docker | `DOCKER_HOST=ssh://<server> docker compose build`. The image is born on the server |
   | `server-build` | the runner has no Docker, and the server has Docker, Git and read access to the repo | the server runs `git checkout <sha>` and `up --build` |

   In all of them, the runner must reach the server by SSH. Without it, none works, and the probe tells what is missing (a self-hosted runner on the server network, or a VPN).

   For a GitLab runner with a Docker executor and no daemon, use DinD (the official `dind` image, in privileged mode) for `registry`. Kaniko and buildah do not read the compose file, so they need one job per service. Use them only on request of the user.

   Without a registry, a private registry (`registry:2` on the server) also works, but it needs TLS and a password. Use it only on request of the user.

   If no row works, stop. Tell what is missing and ask for a decision.
4. **Show the plan and wait for approval.** Use a short table with the forge, the probe, the strategy, the jobs, the variables and what each one changes on the server.
5. **Write the pipeline** from the model of the forge, next to this skill: `gitlab-ci.yaml` (becomes `.gitlab-ci.yml`) or `github-actions.yaml` (becomes `.github/workflows/deploy.yml`). Change the `build` job for the strategy (section below). Fill in the runners.
6. **Write `docker/deploy.sh`** from `deploy.template.sh`, next to this skill, with the adjustment of the strategy (table below). Update the "Prod: deploy" section of `docker/README.md` with the same flow.
7. **Variables.** Register the non-secret ones with the approval of the user: `DEPLOY_HOST` and `DEPLOY_PATH` (GitLab: project variables. GitHub: `gh variable set`). Claude does not register a secret (SSH key, deploy key, token). Give the user the variable name and where to register it. Prefer the access that already exists: the user of a self-hosted runner usually has the server key. On GitHub, a hosted runner needs the `DEPLOY_SSH_KEY` secret and the `DEPLOY_KNOWN_HOSTS` variable.
8. **Server.** The `.env.prod` of the server has `REGISTRY` (in the `registry` strategy) and `APP_NAME`. Check that `compose.prod.yaml` resolves with `docker compose ... config`.
9. **Cleanup.** Apply the "Cleanup" section below, with the approval of the user.
10. **Prove it.** In the `registry` strategy, push a test branch. Only `build` runs, and the image appears in the registry with the SHA tag. In the other strategies, `build` runs only on the default branch. After the merge, confirm the `deploy` with `docker compose ps` on the server (`healthy`) and the response of the app. Report the pipeline link.

## `build` job by strategy

The build uses no secret. The job sets a fake value for each `${VAR:?...}` variable of `compose.prod.yaml`.

`ssh-load` and `remote-build` write to the server. So their `build` runs only on the default branch and on manual trigger. The `build` of `registry` runs on every branch, and the deploy runs only on the default branch and on manual trigger.

`registry` (already in the models): login, `build` and `push`. On GitHub, `REGISTRY` is `ghcr.io/<owner>/<repo>` in **lowercase**, and the model already converts it.

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

## `deploy.sh` adjustment by strategy

The model reads `REGISTRY_HOST`, `REGISTRY_USER` and `REGISTRY_TOKEN` from the environment of the job, so it does not depend on the forge. The pipeline models already fill the three with the job token.

| Strategy | Change in the model |
|---|---|
| `registry` | none. The model runs `login` with the job token, `pull` and `up --no-build` |
| `ssh-load` | remove the `login` and the `pull` |
| `remote-build` | remove the `login` and the `pull` |
| `server-build` | replace the `scp` with `git fetch origin && git checkout $sha` on the server, and the `up` with `up -d --build --wait`. The server then has code |

## Deploy

The deploy is **always automatic**: the `deploy` job runs on each merge to the default branch, after `build`. Never use `when: manual` in it (GitLab) or an `environment` with approval (GitHub). The `--wait` of `deploy.sh` fails the job if a service does not become `healthy`.

You can also trigger the deploy by hand, and the path stays automatic:

| Forge | Manual trigger | Repeat the last deploy |
|---|---|---|
| GitLab | Build > Pipelines > **Run pipeline** on a branch or tag (`$CI_PIPELINE_SOURCE == "web"` in the `rules`) | **Retry** on the `deploy` job |
| GitHub | Actions > `deploy` > **Run workflow** on a branch or tag (`workflow_dispatch`) | **Re-run jobs** on the run |

The manual trigger runs `build` and `deploy` of the chosen ref, with no other click. On a branch that is not the default, it deploys that branch to production.

## Rollback

| Forge | How to go back |
|---|---|
| GitLab | **Rollback** button in Operate > Environments: it repeats the `deploy` job of the previous pipeline |
| GitHub | in Actions, open the run of the previous commit and use **Re-run all jobs**: it repeats `build` and `deploy` of that SHA |

Both copy the compose files of that SHA. The rollback goes only as far as the image exists:

- `registry`: by the retention of the registry.
- `ssh-load` and `remote-build`: by the prune on the server (`until=168h` in `deploy.sh`).
- `server-build`: `up --build` rebuilds the image.

Without the button, run `sh docker/deploy.sh <previous-sha>` on the checkout of that SHA.

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

The policy removes the tags. The space comes back only after the garbage collection of the registry. The GitLab administrator confirms whether it runs by itself.

**GitHub.** GHCR has no retention policy of its own. Use the `github-cleanup.yaml` workflow next to this skill (becomes `.github/workflows/cleanup.yml`). It runs every week and keeps the 10 newest versions of each image, without touching `latest` or `v*`. Check the parameters of the action in the version that you use.

On the server, `deploy.sh` prunes unused images older than 7 days.

## Out of scope

Orchestrator (Swarm, Kubernetes), a staging environment, tests and lint in the pipeline, and a database migration in the deploy. Each one is a separate change.
