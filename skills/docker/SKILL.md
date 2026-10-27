---
name: docker
description: Docker entry point. Routes the request to docker:create (project without Docker) or docker:tune (existing Docker that is broken, slow or out of the standard). Answers specific questions by loading only the sub-skill of the topic. Use for any request about Docker, compose, a Dockerfile, or a dev or prod environment.
argument-hint: "[what you want]"
---

# docker

## Routing

1. Look at the project: `compose.yaml`, `docker-compose*.yml`, `Dockerfile*`, `deploy/`.
2. Choose by the request and by what exists:

| Situation | Skill |
|---|---|
| No Docker, or the request is to create the environment | `docker:create` |
| Docker exists and the request is to adjust, fix, standardize, speed up or update | `docker:tune` |
| A question or a small change on one topic | only the sub-skill of the topic, below |

If you cannot choose between create and tune, ask. Pass the arguments to the chosen skill.

## Sub-skills

They stay out of the `/` menu, but the model loads them with the `Skill` tool. Create and tune load the same ones, so each rule is written in one place.

| Skill | Topic |
|---|---|
| `docker:rules` | rules enforced by the hooks and the file layout |
| `docker:versions` | newest tag on Docker Hub and major version changes |
| `docker:hot-reload` | dev with hot reload and the host user |
| `docker:prod-image` | multi-stage Dockerfile, dockerignore and prod compose |
| `docker:https` | nginx with HTTP/2 and HTTP/3 and certificates |
| `docker:measure` | measurement of build, up, image, app and database |
