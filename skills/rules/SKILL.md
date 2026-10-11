---
name: rules
description: Regras do ambiente Docker (nomes, UID/GID no dev, volumes em pasta local, .env por ambiente, defaults, ./deploy, dockerignore, versões, HTTP/3, hot reload, prod enxuto) e o layout de arquivos. Usada por docker:create e docker:tune; carregue antes de escrever ou revisar compose, Dockerfile ou config de servidor HTTP.
user-invocable: false
---

# Regras do Docker

Os hooks do plugin (`[docker:<regra>]`, um por regra) negam a escrita que viola a tabela abaixo. Se algum negar, corrija o arquivo, nunca contorne (escrever por `cat >` no shell, renomear para fugir do padrão de nome).

| Regra | Como | Garantida por |
|---|---|---|
| Nome do projeto primeiro | `name:` é a primeira chave do compose, antes de `services:`. Dev com o prefixo: `name: dev-${APP_NAME:-<pasta>}`; prod: `name: ${APP_NAME:-<pasta>}` | hook `compose-name` |
| Serviço com nome da tecnologia | `postgres`, `redis`, `node`, `nuxt`, `react`, `nginx`; nunca `app`, `db`, `api`, `web`, `backend`, `frontend` | hook `service-name` |
| Container = projeto + serviço | `container_name: ${COMPOSE_PROJECT_NAME}-<serviço>`, o Compose preenche com o `name:` | hook `container-name` |
| Dev com o usuário do host | todo serviço de dev que monta pasta local roda com `user: "${UID:-1000}:${GID:-1000}"`, e o `.env` do dev tem `UID` e `GID` gerados com `id -u` e `id -g` (o default 1000 erra para usuário de domínio) | hook `dev-user` + `docker:hot-reload` |
| Volume sempre em pasta local | bind mount: dev em `./.data/<serviço>`, prod em `${DATA_DIR:-./data}/<serviço>` (dentro do `deploy/`). Sem volume nomeado nem anônimo | hook `bind-volumes` |
| Um `.env` por ambiente | `./.env` no dev e `deploy/.env` no prod, os dois fora do git. Cada compose lê o `.env` que está ao lado (`env_file` com `path: .env` e `required: false`). Sem `.env.dev`, `.env.prod`, `.env.local` | hook `single-env` |
| Default em todo parâmetro | `${VAR:-valor}`. Segredo de prod sem valor seguro: `${VAR:?defina VAR no deploy/.env}` | hook `var-defaults` |
| Prod em `./deploy` | `deploy/compose.yaml`, `deploy/Dockerfile`, `deploy/Dockerfile.dockerignore`, `deploy/.env` e a config de proxy, se houver | hook `deploy-folder` |
| Dockerignore antes do Dockerfile | todo Dockerfile tem ignore, com pelo menos `**/.env`, `.git`, `.data` e `deploy/data`, mais as dependências e o build da stack (`node_modules`, `vendor`, `dist`, `.nuxt`). Sem isso, o `COPY . .` leva segredo para a imagem, e as pastas de dados do banco quebram ou incham o build | hook `dockerignore` |
| Imagem na versão mais nova | a versão estável mais nova de cada tecnologia, consultada no Docker Hub, nunca da memória (Postgres 18, e não 16; PHP 8.5, e não 8.2). Veja `docker:versions` | `docker:versions` |
| HTTP/2 e HTTP/3 | o servidor HTTP sobe com TLS, `http2`, `http3` (QUIC) e `Alt-Svc`, e publica a 443 em TCP e UDP. Veja `docker:https` | hook `http3` + `docker:https` |
| Dev com hot reload | código montado de `./` e servidor em modo watch | `docker:hot-reload` |
| Prod enxuto e rápido | multi-stage, runtime mínimo, sem código montado | `docker:prod-image` |

Com default em tudo e `required: false`, o compose funciona sem `.env`. O `.env` só sobrescreve valores e guarda os segredos (e, no dev, o `UID`/`GID`).

## Layout

```
.env                        dev: UID, GID e o que sobrescreve os defaults
compose.yaml                dev
Dockerfile                  dev, só se a imagem oficial com um command não resolve
.dockerignore               só se houver Dockerfile de dev
.data/                      volumes de dev (no .gitignore)
nginx/default.conf.template dev, quando há servidor HTTP
certs/
├── generate.sh             gera o certificado autoassinado (versionado)
└── cert.pem, key.pem       gerados (no .gitignore)
deploy/
├── compose.yaml            prod
├── Dockerfile              prod, multi-stage
├── Dockerfile.dockerignore o BuildKit lê o ignore ao lado do Dockerfile, então a raiz fica limpa
├── .env                    prod: segredos e valores de produção
├── nginx/default.conf.template
├── certs/                  cert.pem e key.pem copiados para cá no deploy (no .gitignore)
└── data/                   volumes de prod (no .gitignore)
```
