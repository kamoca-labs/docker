# Development environment

Dev runs the same services as prod. Only the difference goes in `compose.dev.yaml`: `target: dev`, the mounts, the host user and the direct ports. The `build`, the `container_name`, the `depends_on` and the `healthcheck` come from `compose.yaml`.

The watch command of each stack and polling are in the hot-reload reference.

## Host user

- Set `user: "${UID:-1000}:${GID:-1000}"` on every dev service that mounts a local folder with write access, the database included. Files that the service writes (`node_modules`, `vendor`, `docker/database/data/dev`) then belong to your user and need no `sudo` to remove. A read-only mount (`:ro`, like the nginx certificates) needs no user.
- Always generate `UID` and `GID` in the dev `.env`. Never leave the default. Run `printf 'UID=%s\nGID=%s\n' "$(id -u)" "$(id -g)" >> .env` (if they are not there yet). A domain user has a UID far from 1000.
- Run `mkdir -p docker/<service>/data/dev` for each volume **before** the start. If Docker creates the folder, root owns it and the service, which runs as you, cannot write.
- Check with `ls -ln docker/<service>/data`. The owner must be equal to `id -u`.

## Example (`compose.dev.yaml`)

```yaml
name: dev-${APP_NAME:-shop}

services:
  backend:
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

  database:
    build:
      target: dev
    user: "${UID:-1000}:${GID:-1000}"
    environment:
      POSTGRES_DB: ${DB_NAME:-shop}
      POSTGRES_USER: ${DB_USER:-shop}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-shop}
    volumes:
      - ./docker/database/data/dev:/var/lib/postgresql
```

- The dev `.env` sets `COMPOSE_FILE=compose.yaml:compose.dev.yaml`, so `docker compose` works without flags.
- The ports of the services that only talk inside the network (reader, replicas) stay out of the dev file, unless you need them from the host.
- A service of prod that has no dev difference needs no entry in `compose.dev.yaml`, except `target: dev`.

Start it with:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d --wait
```

## Check

1. `docker compose -f compose.yaml -f compose.dev.yaml config` resolves with no error and shows the names.
2. Every service is `healthy` after `up -d --wait`, and the app answers.
3. The owner of each `docker/<service>/data/dev` folder equals `id -u`.
4. Hot reload works. The hot-reload reference has the check.
