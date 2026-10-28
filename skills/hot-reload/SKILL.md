---
name: hot-reload
description: Dev environment with hot reload and the host user in compose.dev.yaml. Mounted code, the dev target, a watch command per stack, UID/GID generated in the .env, data folders created before start, polling when the watcher fails. Used by docker:create and docker:tune in the dev compose file.
user-invocable: false
---

# Hot reload and the host user

## Host user

- Set `user: "${UID:-1000}:${GID:-1000}"` on every dev service that mounts a local folder with write access, the database included. Files that the service writes (`node_modules`, `vendor`, `docker/postgres/data/dev`) then belong to your user and need no `sudo` to remove. A read-only mount (`:ro`, like the nginx certificates) needs no user.
- Always generate `UID` and `GID` in the dev `.env`. Never leave the default. Run `printf 'UID=%s\nGID=%s\n' "$(id -u)" "$(id -g)" >> .env` (if they are not there yet). A domain user has a UID far from 1000.
- Run `mkdir -p docker/<service>/data/dev` for each volume **before** the start. If Docker creates the folder, root owns it and the service, which runs as you, cannot write.
- Check with `ls -ln docker/<service>/data`. The owner must be equal to `id -u`.

## By stack

| Stack | Dev |
|---|---|
| Node (Vite, Next, Nest) | `npm install && npm run dev -- --host 0.0.0.0`. Nest uses `start:dev`. An API without a framework uses `node --watch` |
| PHP / Laravel | PHP reads the file again on each request. Use `php artisan serve --host=0.0.0.0` or php-fpm + nginx. Run Vite in another service for the assets |
| Python | `uvicorn --reload`, `flask run --debug`, `manage.py runserver 0.0.0.0:8000` |
| Go | `air` |

Keep the code in `./:/app`. The command listens on `0.0.0.0`. The dependencies install in the container and land in the local folder.

If the watcher does not see the change (Docker Desktop, WSL2 with the code on Windows), turn on polling with a variable that has a default: `CHOKIDAR_USEPOLLING: ${CHOKIDAR_USEPOLLING:-false}`, `WATCHPACK_POLLING`.

To check: change a file of the app, confirm in the log or in the response that it reloaded, and revert the change.

## Example (`compose.dev.yaml`)

Only the dev difference. The `build`, the `container_name`, the `depends_on` and the `healthcheck` come from `compose.yaml`.

```yaml
name: dev-${APP_NAME:-shop}

services:
  node:
    build:
      target: dev
    working_dir: /app
    user: "${UID:-1000}:${GID:-1000}"
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
    env_file:
      - path: .env
        required: false
    ports:
      - "${APP_PORT:-5173}:5173"
    volumes:
      - ./:/app

  postgres:
    build:
      target: dev
    user: "${UID:-1000}:${GID:-1000}"
    environment:
      POSTGRES_DB: ${DB_NAME:-shop}
      POSTGRES_USER: ${DB_USER:-shop}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-shop}
    volumes:
      - ./docker/postgres/data/dev:/var/lib/postgresql
```

Start it with:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d --wait
```
