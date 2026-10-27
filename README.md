# Plugin `docker`

## Sumário

- [Instalação](#instalação)
- [Visão geral](#visão-geral)
- [Comandos](#comandos)
- [Regras](#regras)
- [Arquivos](#arquivos)
- [Casos de uso](USAGE.md)

## Instalação

```bash
claude plugin marketplace add kamoca-labs/marketplace
claude plugin install docker@kamoca
```

Requer Node 22.18+. Os comandos aparecem na próxima sessão.

## Visão geral

Ambiente Docker com o mesmo padrão em todo projeto. O fluxo é sempre **funcionar primeiro, seguindo as regras, e só depois otimizar com medição**. O `/docker:docker` é a entrada: olha o projeto e roteia para `/docker:create` (faz funcionar) ou `/docker:tune` (conforma e otimiza). Os hooks negam a escrita de compose que foge das regras, então o padrão vale mesmo fora das skills.

## Comandos

| Comando | Argumentos | O que faz |
|---|---|---|
| `/docker:docker` | `[o que você quer]` | Entrada única: sem Docker no projeto vai para o create, com Docker vai para o tune; dúvida pontual carrega só a sub-skill do assunto |
| `/docker:create` | `[dev\|prod] [stack ou serviços]` | Imagens na versão estável mais nova, consultada no Docker Hub. Dev na raiz com hot reload (código montado, servidor em watch) e UID/GID do host gerados no `.env`; prod em `./deploy`, com `.env` próprio e imagem multi-stage enxuta. Com servidor HTTP, nginx com HTTP/2 e HTTP/3, `certs/generate.sh` para o certificado autoassinado e `deploy/certs/` para receber o certificado no deploy. Sobe, confirma o hot reload e reporta a linha de base (build, up, tamanho) |
| `/docker:tune` | `[foco]` | Faz subir, põe nas regras (migra volume nomeado para pasta local com confirmação), mede (build frio e quente, up, imagem, recursos, latência, banco) e testa uma otimização por vez: camadas, cache, healthcheck, PgBouncer, Redis, segundo banco, proxy. Fica só o que ganhou |

### Sub-skills

Ficam fora do menu de `/` (`user-invocable: false`), mas o modelo carrega pela ferramenta `Skill`. O create e o tune usam as mesmas, então cada regra é escrita num lugar só.

| Skill | Assunto |
|---|---|
| `docker:rules` | regras garantidas pelos hooks e layout de arquivos |
| `docker:versions` | tag mais nova no Docker Hub e troca de major |
| `docker:hot-reload` | dev com hot reload e usuário do host |
| `docker:prod-image` | Dockerfile multi-stage, dockerignore e compose de prod |
| `docker:https` | nginx com HTTP/2 e HTTP/3 e certificados |
| `docker:measure` | medição de build, up, imagem, app e banco |

## Regras

| Regra | Hook | Nega |
|---|---|---|
| Nome do projeto primeiro | `compose-name` | compose cuja primeira chave não é `name:`; compose de dev sem o prefixo `dev-` no `name` |
| Serviço com nome da tecnologia | `service-name` | `app`, `db`, `api`, `web`, `backend`, `frontend` e outros genéricos; use `node`, `nuxt`, `postgres`, `redis` |
| Container = projeto + serviço | `container-name` | `container_name` diferente de `${COMPOSE_PROJECT_NAME}-<serviço>` |
| Dev com o usuário do host | `dev-user` | serviço de dev que monta pasta local com escrita sem `user: "${UID:-1000}:${GID:-1000}"` (montagem `:ro` não precisa) |
| Volume em pasta local | `bind-volumes` | volume nomeado (no serviço ou no topo), anônimo ou `type: volume` |
| Um `.env` por ambiente | `single-env` | `.env.<qualquer>` (exceto `.env.example`) e `env_file` que não é o `.env` ao lado do compose |
| Default em todo parâmetro | `var-defaults` | `${VAR}` ou `$VAR` sem `:-default` ou `:?erro` |
| Prod em `./deploy` | `deploy-folder` | compose ou Dockerfile com `prod` no nome fora de `deploy/` |
| HTTP/2 e HTTP/3 | `http3` | conf do nginx com `listen ... ssl` sem `quic`, `http2 on`, `http3 on` ou `Alt-Svc`; serviço que publica a 443 sem `443/udp` |
| Dockerignore sem segredo nem dados | `dockerignore` | ignore sem `**/.env`, `.git`, `.data`, `deploy/data`; Dockerfile sem ignore ao lado |

Os hooks rodam em `Write` e `Edit` (no `Edit`, sobre o arquivo como fica depois da edição) e as regras de compose só olham `compose*.yaml`/`docker-compose*.yml`. `single-env`, `deploy-folder` e `dockerignore` olham também o nome e o lugar do arquivo. Compose dentro de `deploy/` é prod; fora dele, dev. Hot reload no dev, imagem enxuta em prod e versão mais nova das imagens (que depende de consultar o Docker Hub) ficam com as skills.

## Arquivos

```
plugins/docker/
├── .claude-plugin/plugin.json
├── skills/docker/SKILL.md   hub: roteia para create ou tune
├── skills/{create,tune}/SKILL.md
├── skills/<assunto>/SKILL.md sub-skills privadas, compartilhadas
└── hooks/                  mesma estrutura do git: hooks.json, lib.ts, rules/, tests/
```
