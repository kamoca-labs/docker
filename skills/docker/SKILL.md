---
name: docker
description: Docker entry point. Routes the request to docker:create (project without Docker), docker:tune (existing Docker that is broken, slow or out of the standard) or docker:ci (build and deploy pipeline). Answers specific questions by loading only the sub-skill of the topic. Use for any request about Docker, compose, a Dockerfile, or a dev or prod environment.
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
| A question or a small change on one topic | only the sub-skill of the topic, below |

If you cannot choose between create and tune, ask. Pass the arguments to the chosen skill.

## Sub-skills

They stay out of the `/` menu, but the model loads them with the `Skill` tool. Create and tune load the same ones, so each rule is written in one place.

| Skill | Topic |
|---|---|
| `docker:rules` | rules enforced by the hooks, the file layout and the split between base and environment |
| `docker:versions` | newest tag on Docker Hub and major version changes |
| `docker:hot-reload` | dev with hot reload and the host user |
| `docker:prod-image` | single multi-stage Dockerfile, dockerignore, prod compose and local prod test |
| `docker:https` | nginx with HTTP/2 and HTTP/3 and certificates |
| `docker:measure` | measurement of build, up, image, app and database |
