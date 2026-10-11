---
name: tune
description: Ajusta o Docker que já existe no projeto. Primeiro faz subir e põe nas regras do plugin (nomes, UID/GID do host no dev, volumes em pasta local, um .env por ambiente, defaults, dockerignore, hot reload no dev, prod enxuto em ./deploy); depois otimiza com medição de tempo de build, tempo de up, tamanho de imagem e métricas da aplicação, testando uma mudança de arquitetura por vez (pooler, cache, segundo banco, proxy). Use quando o ambiente Docker está quebrado, lento, pesado ou fora do padrão.
argument-hint: "[foco: build, up, imagem, banco, ...]"
---

# docker:tune

Funcionar → regras → medir → mudar uma coisa → medir de novo → manter só o que ganhou. Nunca otimize o que ainda não sobe.

Carregue com a ferramenta `Skill` cada sub-skill no passo em que ela entra.

## 1. Funcionar

`docker compose config`, `docker compose up -d --wait` e o mesmo com `-f deploy/compose.yaml`. O que não fica `healthy`: `docker compose logs <serviço>`, causa raiz, correção. Só siga com tudo de pé.

## 2. Regras

Carregue `docker:rules` e ponha o que existe nas regras. Os hooks negam qualquer escrita de compose fora delas, então o compose antigo é reescrito por inteiro, não remendado. O que muda de lugar:

| Antes | Depois |
|---|---|
| volume nomeado com dados | pare o serviço, copie os dados para a pasta local (`docker run --rm -v <volume>:/from -v ./.data/<serviço>:/to alpine cp -a /from/. /to`), aponte o bind mount e confira os dados antes de remover o volume. **Nunca** remova o volume sem a confirmação do usuário |
| `.env.dev`, `.env.prod` | `./.env` para o dev e `deploy/.env` para o prod |
| `app`, `db`, container sem nome | serviço com o nome da tecnologia (`node`, `postgres`) e `container_name: ${COMPOSE_PROJECT_NAME}-<serviço>`; troque também o host nas URLs de conexão (`@db:` vira `@postgres:`) |
| dev rodando como root, arquivos de root na pasta | `user: "${UID:-1000}:${GID:-1000}"`, `UID`/`GID` gerados no `.env` e `sudo chown -R "$(id -u):$(id -g)" .data` (o `sudo` com o ok do usuário) |
| Dockerfile sem ignore ou com `.env` no contexto | ignore com `**/.env`, `.git`, `.data`, `deploy/data` e as dependências da stack |
| `docker-compose.prod.yml` na raiz | `deploy/compose.yaml` com `context: ..` |
| dev sem hot reload (código copiado na imagem) | `docker:hot-reload` |
| imagem de prod com toolchain e dependências de dev | `docker:prod-image` |
| imagem em versão antiga (`postgres:16`, `php:8.2`) ou `latest` | `docker:versions`, inclusive a troca de major de banco com dados |
| nginx com TLS só em HTTP/1.1, sem `443/udp` | `docker:https` |

Suba de novo (passo 1) antes de medir.

## 3. Medir

Linha de base antes de qualquer otimização, com `docker:measure`.

## 4. Otimizar

Uma mudança por vez. Depois de cada uma: sobe (passo 1), mede (`docker:measure`) e compara. Ganhou de forma clara (10% ou mais na medida que a mudança mira, sem piorar as outras): fica. Não ganhou: desfaz.

### Build e imagem

Os sinais e as mudanças estão em `docker:prod-image`.

### Up

| Sinal | Mudança |
|---|---|
| app espera o banco mais que o necessário | `healthcheck` com `start_interval` curto e `interval` realista |
| serviço espera outro de que não depende | tire o `depends_on` |
| migração ou instalação no caminho do start em prod | mova para o build ou para um serviço de uma execução |

### Arquitetura

Só com sinal na medição. Serviço novo segue as mesmas regras (nome da tecnologia, container com o nome do projeto, `user` no dev, volume em pasta local, default, `.env` do ambiente).

| Sinal | Mudança |
|---|---|
| muitas conexões abertas, tempo alto para conectar, `too many connections` | PgBouncer em `transaction` (ProxySQL no MySQL) entre a app e o banco |
| a mesma consulta repetida, sessão ou fila no banco | Redis para cache, sessão ou fila |
| leitura pesada travando a escrita | segundo banco: réplica de leitura com a app separando leitura e escrita, ou um banco por domínio quando os dados não se cruzam |
| a app serve arquivo estático | nginx ou Caddy na frente servindo `public/` |
| CPU da app no teto com um processo só | mais workers (php-fpm `pm.max_children`, gunicorn `--workers`, cluster do Node) antes de mais réplicas |

## 5. Reportar

A tabela de antes e depois de `docker:measure` e, abaixo, uma linha por mudança: o que foi feito, o ganho e as que foram desfeitas por não ganhar.
