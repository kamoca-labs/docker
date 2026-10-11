---
name: prod-image
description: Imagem de produção enxuta e rápida em ./deploy: Dockerfile multi-stage, dockerignore, compose de prod e sinais de imagem ou build lentos. Usada por docker:create e docker:tune ao escrever ou otimizar o prod.
user-invocable: false
---

# Imagem de produção

## Dockerfile (`deploy/Dockerfile`)

- Multi-stage: a etapa de build tem o toolchain, a de runtime leva só o artefato.
- Base `-alpine`, `-slim` ou distroless, na versão de `docker:versions`.
- Só dependências de prod; lockfile copiado e instalado antes do código, para aproveitar o cache de camada.
- `RUN --mount=type=cache,target=<cache do gerenciador>` no gerenciador de pacote.
- `USER` sem root e `HEALTHCHECK`.

## Dockerignore (`deploy/Dockerfile.dockerignore`)

Escrito **antes** do Dockerfile (o hook nega o Dockerfile sem ignore). O BuildKit lê o ignore ao lado do Dockerfile, então a raiz fica limpa. Pelo menos `**/.env`, `.git`, `.data`, `deploy/data`, `certs`, `deploy/certs`, mais as dependências e o build da stack (`node_modules`, `vendor`, `dist`, `.nuxt`). Sem isso, o `COPY . .` leva segredo e certificado para a imagem, e as pastas de dados do banco quebram ou incham o build.

## Compose (`deploy/compose.yaml`)

`build: { context: .., dockerfile: deploy/Dockerfile }`, `restart: unless-stopped`, sem montar código, só os volumes de dados (`${DATA_DIR:-./data}/<serviço>`) e os certificados. Segredo sem default seguro: `${VAR:?defina VAR no deploy/.env}`, com o valor gerado no `deploy/.env` (`openssl rand -hex 24`). Sobe com `docker compose -f deploy/compose.yaml up -d --build --wait`; o Compose lê o `deploy/.env` sozinho.

## Sinais de build ou imagem ruins

| Sinal | Mudança |
|---|---|
| build quente igual ao frio | copiar o lockfile e instalar antes de copiar o código |
| download de pacote a cada build | `RUN --mount=type=cache` |
| contexto de build grande (`transferring context` alto no log do build) | completar o dockerignore com as dependências e o build da stack |
| imagem de prod grande | runtime menor, sem dependências de dev, só o artefato |
