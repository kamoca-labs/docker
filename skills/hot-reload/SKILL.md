---
name: hot-reload
description: Hot reload of the dev services. A watch command for each stack, the mounted code, polling when the watcher does not see the change, and how to check that it reloads. Used by docker:development.
user-invocable: false
---

# Hot reload

The dev compose file, the host user and the data folders belong to `docker:development`. This skill covers only the watch command.

## By stack

| Stack | Dev |
|---|---|
| Node (Vite, Next, Nest) | `npm install && npm run dev -- --host 0.0.0.0`. Nest uses `start:dev`. An API without a framework uses `node --watch` |
| PHP / Laravel | PHP reads the file again on each request. Use `php artisan serve --host=0.0.0.0` or php-fpm + nginx. Run Vite in another service for the assets |
| Python | `uvicorn --reload`, `flask run --debug`, `manage.py runserver 0.0.0.0:8000` |
| Go | `air` |

Keep the code in `./:/app`. The command listens on `0.0.0.0`. The dependencies install in the container and land in the local folder.

## Polling

If the watcher does not see the change (Docker Desktop, WSL2 with the code on Windows), turn on polling with a variable that has a default: `CHOKIDAR_USEPOLLING: ${CHOKIDAR_USEPOLLING:-false}`, `WATCHPACK_POLLING`.

## Check

Change a file of the app, confirm in the log or in the response that it reloaded, and revert the change.
