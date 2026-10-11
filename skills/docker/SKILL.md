---
name: docker
description: Ponto de entrada do Docker. Roteia o pedido para docker:create (projeto sem Docker) ou docker:tune (Docker que já existe, quebrado, lento ou fora do padrão), e responde dúvidas pontuais carregando só a sub-skill do assunto. Use em qualquer pedido sobre Docker, compose, Dockerfile, ambiente de dev ou prod.
argument-hint: "[o que você quer]"
---

# docker

## Roteamento

1. Olhe o projeto: `compose.yaml`, `docker-compose*.yml`, `Dockerfile*`, `deploy/`.
2. Escolha pelo pedido e pelo que existe:

| Situação | Skill |
|---|---|
| Sem Docker, ou o pedido é para criar o ambiente | `docker:create` |
| Já tem Docker e o pedido é ajustar, corrigir, padronizar, deixar mais rápido ou atualizar | `docker:tune` |
| Dúvida ou mudança pontual num assunto só | só a sub-skill do assunto, abaixo |

Na dúvida entre create e tune, pergunte. Repasse os argumentos para a skill escolhida.

## Sub-skills

Ficam fora do menu de `/`, mas o modelo carrega pela ferramenta `Skill`. O create e o tune carregam as mesmas, então a regra é escrita num lugar só.

| Skill | Assunto |
|---|---|
| `docker:rules` | regras garantidas pelos hooks e layout de arquivos |
| `docker:versions` | tag mais nova no Docker Hub e troca de major |
| `docker:hot-reload` | dev com hot reload e usuário do host |
| `docker:prod-image` | Dockerfile multi-stage, dockerignore e compose de prod |
| `docker:https` | nginx com HTTP/2 e HTTP/3 e certificados |
| `docker:measure` | medição de build, up, imagem, app e banco |
