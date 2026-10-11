---
name: create
description: Cria o ambiente Docker de um projeto que ainda não tem. Dev na raiz com hot reload e o usuário do host; prod enxuto em ./deploy com .env próprio; imagens na versão mais nova; servidor HTTP com HTTP/2 e HTTP/3. Use ao dockerizar um projeto ou quando pedirem compose, Dockerfile ou ambiente de dev ou prod do zero.
argument-hint: "[dev|prod] [stack ou serviços]"
---

# docker:create

Primeiro **funcionar**, já dentro das regras. Otimizar vem depois, com `docker:tune`. Sem argumento, cria dev e prod.

Carregue com a ferramenta `Skill` cada sub-skill no passo em que ela entra, e só se o projeto precisar dela.

## Passos

1. **Levante o projeto**: stack pelos manifestos e lockfile, comando de dev, porta, serviços de que o código depende (banco, cache, fila, e-mail) e se precisa de servidor HTTP na frente (php-fpm sempre precisa; estáticos, proxy reverso, HTTPS). Se já existe Docker, pare e use `docker:tune`.
2. **Regras e versões**: carregue `docker:rules` e `docker:versions` e consulte a tag de cada imagem no Docker Hub.
3. **Mostre o plano e espere o ok**: arquivos, serviços com imagem e tag consultada, portas, variáveis com seus defaults. Uma tabela curta.
4. **Dev**: `docker:hot-reload`. Serviço da aplicação com o nome da tecnologia (`node`, `nuxt`, `php`), serviços de apoio com imagem oficial, `healthcheck` e dados em `./.data/<serviço>`, e `depends_on` com `condition: service_healthy` só onde a app precisa do serviço de pé.
5. **Prod**: `docker:prod-image`.
6. **Servidor HTTP**, se houver: `docker:https`, com o certificado do dev e o de simulação do prod.
7. **`.env` e `.gitignore`**: `./.env` com `UID`/`GID` gerados e `deploy/.env` com os segredos. No `.gitignore`: `.env`, `deploy/.env`, `.data/`, `deploy/data/`, `certs/*.pem` e `deploy/certs/`.
8. **Faça funcionar**, nesta ordem, corrigindo até tudo passar:
   - `docker compose config` valida a interpolação e mostra os nomes;
   - `docker compose up -d --wait`: tudo `healthy`, a app responde;
   - hot reload e dono das pastas (`docker:hot-reload`);
   - h2 e h3, se houver servidor HTTP (`docker:https`);
   - `docker compose -f deploy/compose.yaml up -d --build --wait`.
9. **Reporte**: os arquivos, os comandos de subir dev e prod e a linha de base de `docker:measure` (build, up e tamanho da imagem de prod).

## Fora do escopo

Otimização de arquitetura e de tempo de build: `docker:tune`. CI, registry e orquestrador (Swarm, Kubernetes): só se pedirem, em mudança separada.
