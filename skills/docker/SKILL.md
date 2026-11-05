---
name: docker
description: Routes a Docker request to docker:create (no Docker yet), docker:tune (Docker that is broken, slow or out of the standard) or docker:ci (build and deploy pipeline), or answers one topic from a reference file. Use when a request is about Docker, compose, a Dockerfile or a dev or prod environment.
argument-hint: "[what you want]"
---

# docker

## Routing

1. Look at the project: `compose*.yaml`, `docker-compose*.yml`, `Dockerfile*` and the `docker/` folder (in the old layout, `deploy/`).
2. Choose by the request and by what exists:

| Situation | Skill |
|---|---|
| No Docker, or the request is to create the environment | `docker:create` |
| Docker exists and the request is to adjust, fix, standardize, speed up or update | `docker:tune` |
| A request for CI, CD, a pipeline, automatic deploy, a registry or a rollback | `docker:ci` |
| A question or a small change on one topic | only the reference of the topic, below |

If you cannot choose between create and tune, ask. Pass the arguments to the chosen skill.

## References

The references are in the `references/` folder of this skill. Read only the reference of the topic with the `Read` tool. Create and tune read the same files, so each rule is written in one place.

| Reference | Topic |
|---|---|
| `references/rules.md` | rules enforced by the hooks, the file layout and the split between base and environment |
| `references/versions.md` | newest tag on Docker Hub and major version changes |
| `references/development.md` | dev compose file, host user, data folders and the start command |
| `references/hot-reload.md` | watch command for each stack and polling |
| `references/production.md` | single multi-stage Dockerfile, dockerignore, prod compose and local prod test |
| `references/https.md` | nginx with HTTP/2 and HTTP/3 and certificates |
| `references/measure.md` | measurement of build, up, image, app and database |
