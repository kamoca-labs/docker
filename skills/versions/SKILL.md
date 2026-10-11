---
name: versions
description: Escolha da versão das imagens: consulta da tag mais nova no Docker Hub, política de tag, exceções e armadilhas de troca de major (Postgres 18). Usada por docker:create e docker:tune ao escolher ou atualizar imagem.
user-invocable: false
---

# Versões das imagens

Use a versão estável mais nova de cada tecnologia. A memória do modelo está sempre atrasada, então consulte antes de escrever a tag:

```bash
curl -s "https://hub.docker.com/v2/repositories/library/postgres/tags?page_size=100&ordering=last_updated" \
  | python3 -c 'import json,sys; print(*[t["name"] for t in json.load(sys.stdin)["results"]])'
```

- **Tag pela major (ou major.minor)** com a variante enxuta: `postgres:18-alpine`, `php:8.5-fpm-alpine`, `redis:8-alpine`, `nginx:1-alpine`. Assim os patches de segurança vêm no próximo pull, sem mudar de major sozinho.
- **Node**: a LTS mais nova (versão par já promovida a LTS), não a Current.
- **Quando o projeto não suporta a mais nova** (a restrição no `composer.json` ou no `package.json`, ou uma extensão ou framework que ainda não saiu para ela), use a mais nova suportada e diga no plano o que impede a atualização.
- **Postgres 18 mudou o diretório de dados**: monte `./.data/postgres:/var/lib/postgresql`, e não `.../data`. Com o caminho antigo, o container recusa subir.

## Trocar de major num projeto que já tem dados

A pasta de dados de uma major não serve na seguinte. Sempre com o ok do usuário:

1. `pg_dumpall` (ou `mysqldump --all-databases`) no container antigo, para um arquivo em `./.data/`.
2. Suba a versão nova numa pasta nova (`./.data/postgres-18`), restaure e confira contagens das tabelas principais.
3. Aponte o compose para a pasta nova; a antiga só é apagada depois de o usuário confirmar.
