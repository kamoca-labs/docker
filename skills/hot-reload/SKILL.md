---
name: hot-reload
description: Ambiente de dev com hot reload e com o usuário do host: código montado, comando em watch por stack, UID/GID gerados no .env, pastas de dados criadas antes de subir, polling quando o watcher falha. Usada por docker:create e docker:tune no compose de dev.
user-invocable: false
---

# Hot reload e usuário do host

## Usuário do host

- `user: "${UID:-1000}:${GID:-1000}"` em todo serviço de dev que monta pasta local com escrita, inclusive o banco: o que ele gravar (`node_modules`, `vendor`, `.data/postgres`) fica com o seu usuário e sai sem `sudo`. Montagem só de leitura (`:ro`, como a config do nginx) não precisa.
- `UID` e `GID` sempre gerados no `.env` do dev, nunca deixados no default: `printf 'UID=%s\nGID=%s\n' "$(id -u)" "$(id -g)" >> .env` (se ainda não tiver). Usuário de domínio tem UID longe de 1000.
- `mkdir -p .data/<serviço>` para cada volume **antes** de subir: se o Docker criar a pasta, ela fica com dono root e o serviço, rodando como você, não grava.
- Conferir com `ls -ln .data`: dono igual ao `id -u`.

## Por stack

| Stack | Dev |
|---|---|
| Node (Vite, Next, Nest) | `npm install && npm run dev -- --host 0.0.0.0`; Nest com `start:dev`; API sem framework com `node --watch` |
| PHP / Laravel | PHP relê o arquivo a cada request; `php artisan serve --host=0.0.0.0` ou php-fpm + nginx; Vite em outro serviço para os assets |
| Python | `uvicorn --reload`, `flask run --debug`, `manage.py runserver 0.0.0.0:8000` |
| Go | `air` |

O código fica em `./:/app`, o comando escuta em `0.0.0.0` e as dependências instalam no container, caindo na pasta local.

Se o watcher não percebe a mudança (Docker Desktop, WSL2 com o código no Windows), ligue polling por variável com default: `CHOKIDAR_USEPOLLING: ${CHOKIDAR_USEPOLLING:-false}`, `WATCHPACK_POLLING`.

Para conferir: altere um arquivo da app, veja no log ou na resposta que recarregou e desfaça a alteração.

## Exemplo

```yaml
name: dev-${APP_NAME:-loja}

services:
  node:
    container_name: ${COMPOSE_PROJECT_NAME}-node
    image: node:24-alpine
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
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    container_name: ${COMPOSE_PROJECT_NAME}-postgres
    image: postgres:18-alpine
    user: "${UID:-1000}:${GID:-1000}"
    environment:
      POSTGRES_DB: ${DB_NAME:-loja}
      POSTGRES_USER: ${DB_USER:-loja}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-loja}
    volumes:
      - ./.data/postgres:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER}"]
      interval: 5s
      start_period: 10s
```
