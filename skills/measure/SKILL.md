---
name: measure
description: How to measure the Docker environment. Covers cold and warm build time, time to healthy, image size, resources, and application and database latency, always as the median of 3 runs. Used by docker:create (baseline) and docker:tune (before and after each change).
user-invocable: false
---

# Measure

Run each measurement **3 times** and use the median. Always use the same endpoint and the same load, so that before and after are comparable.

Each `docker compose` command below takes the `-f` flags of the measured environment. Dev uses `-f compose.yaml -f compose.dev.yaml`. Prod uses `-f compose.yaml -f compose.prod.yaml --env-file .env.prod`.

| Measurement | How |
|---|---|
| Cold build | `time docker compose build --no-cache <service>` |
| Warm build | change a code file and run `time docker compose build <service>`. It shows whether the layer order uses the cache |
| Up | `docker compose down && time docker compose up -d --wait` |
| Image | `docker image ls --format '{{.Repository}}:{{.Tag}} {{.Size}}'` |
| Resources | `docker stats --no-stream` with the app under load |
| App | p50 and p95 latency and requests per second with `oha`, `hey` or `ab`, whichever is installed. With none of them, use a loop of `curl -w '%{time_total}'` |
| Database | connections (`select count(*) from pg_stat_activity`), slow queries (`pg_stat_statements`, MySQL slow log) |

`docker:create` reports only build, up and image, as the baseline. `docker:tune` uses the whole table.

Never run `docker system prune` or `docker builder prune` without asking. They delete the cache of all projects on the machine.

## Report

```
| Measurement     | Before | After  |
|-----------------|--------|--------|
| Warm build      | 94 s   | 6 s    |
| Up to healthy   | 41 s   | 12 s   |
| Prod image      | 1.2 GB | 180 MB |
| p95 /api/order  | 420 ms | 95 ms  |
```
