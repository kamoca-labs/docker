---
name: measure
description: Como medir o ambiente Docker: tempo de build frio e quente, tempo até healthy, tamanho de imagem, recursos, latência da aplicação e banco, sempre pela mediana de 3 execuções. Usada por docker:create (linha de base) e docker:tune (antes e depois de cada mudança).
user-invocable: false
---

# Medir

Rode cada medida **3 vezes** e use a mediana. Sempre o mesmo endpoint e a mesma carga, para que antes e depois sejam comparáveis.

| Medida | Como |
|---|---|
| Build frio | `time docker compose build --no-cache <serviço>` |
| Build quente | altere um arquivo de código e `time docker compose build <serviço>`: mostra se a ordem das camadas aproveita o cache |
| Up | `docker compose down && time docker compose up -d --wait` |
| Imagem | `docker image ls --format '{{.Repository}}:{{.Tag}} {{.Size}}'` |
| Recursos | `docker stats --no-stream` com a app sob carga |
| App | latência p50 e p95 e requisições por segundo com `oha`, `hey` ou `ab`, o que estiver instalado; sem nenhum, um laço de `curl -w '%{time_total}'` |
| Banco | conexões (`select count(*) from pg_stat_activity`), consultas lentas (`pg_stat_statements`, slow log do MySQL) |

O `docker:create` reporta só build, up e imagem, como linha de base. O `docker:tune` usa a tabela inteira.

Nunca rode `docker system prune` nem `docker builder prune` sem pedir: apagam o cache de todos os projetos da máquina.

## Relatório

```
| Medida          | Antes  | Depois |
|-----------------|--------|--------|
| Build quente    | 94 s   | 6 s    |
| Up até healthy  | 41 s   | 12 s   |
| Imagem de prod  | 1,2 GB | 180 MB |
| p95 /api/pedido | 420 ms | 95 ms  |
```
