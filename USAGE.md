# Uso do plugin `docker`

## Sumário

- [Dockerizar um projeto](#dockerizar-um-projeto)
- [Subir dev e prod](#subir-dev-e-prod)
- [HTTPS local](#https-local)
- [Ajustar e otimizar](#ajustar-e-otimizar)
- [Quando o hook nega](#quando-o-hook-nega)

## Dockerizar um projeto

```
/docker:docker                     # roteia sozinho: sem Docker, cria; com Docker, ajusta
/docker:create
/docker:create dev node com postgres e redis
```

O Claude levanta stack, porta e serviços, mostra o plano e **espera o seu ok**. Depois cria `compose.yaml` (dev), `deploy/` (prod), os dois `.env` (o do dev com seu `UID`/`GID`), as pastas de dados e o `.gitignore`, sobe tudo, altera um arquivo para confirmar o hot reload e reporta build, up e tamanho da imagem.

## Subir dev e prod

```bash
docker compose up -d --wait                                # dev, lê ./.env
docker compose -f deploy/compose.yaml up -d --build --wait  # prod, lê deploy/.env
```

Cada compose lê o `.env` que está ao lado dele. Dev e prod têm nomes diferentes (`dev-loja-*` e `loja-*`), então rodam juntos na mesma máquina.

## HTTPS local

```bash
./certs/generate.sh                 # dev: certs/cert.pem e certs/key.pem para localhost
./certs/generate.sh deploy/certs    # simula o prod; no servidor, o certificado real é copiado para deploy/certs/
```

O nginx sobe com HTTP/2 e HTTP/3. Para conferir o h3, o curl precisa ter suporte; o do host normalmente não tem, então o `/docker:create` testa num container `debian:trixie-slim`. O navegador avisa que o certificado é autoassinado: aceite uma vez para `localhost`.

## Ajustar e otimizar

```
/docker:tune
/docker:tune up está lento
```

1. Sobe e corrige o que não fica `healthy`.
2. Reescreve o que foge das regras. Volume nomeado com dados é copiado para a pasta local e só é removido com o seu ok.
3. Mede a linha de base, 3 vezes, pela mediana.
4. Uma mudança por vez, medindo de novo: fica o que ganhou 10% ou mais, o resto é desfeito.
5. Tabela de antes e depois.

## Quando o hook nega

```
[docker:compose-name] A primeira chave do compose deve ser `name:` com valor ...
[docker:service-name] Serviço com nome genérico: app, db. Use o nome da tecnologia ...
[docker:container-name] container_name deve ser o name do projeto + o serviço: postgres → ${COMPOSE_PROJECT_NAME}-postgres.
[docker:dev-user] Serviço de dev que grava na pasta local sem o usuário do host: postgres. ...
[docker:bind-volumes] Volume que não aponta para pasta local: postgres: pgdata:/var/lib/postgresql. ...
[docker:single-env] .env.production: um .env por ambiente, ./.env no dev e deploy/.env no prod.
[docker:var-defaults] Variável sem default: APP_PORT. Use ${APP_PORT:-valor}; ...
[docker:deploy-folder] docker-compose.prod.yml: tudo de prod fica em ./deploy ...
[docker:http3] Server com TLS sem HTTP/2 e HTTP/3. Falta: listen 443 quic reuseport; http2 on; http3 on; ...
[docker:dockerignore] Dockerfile sem .dockerignore. Crie antes Dockerfile.dockerignore ao lado dele, ...
```

Falso positivo: o caso fica em `~/.claude/hook-cases.jsonl` e vira teste no `hooks/tests/cases.json` (veja [transformar caso real em teste](https://github.com/kamoca-labs/marketplace/blob/main/USAGE.md#transformar-caso-real-em-teste)).
