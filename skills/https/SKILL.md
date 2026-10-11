---
name: https
description: Servidor HTTP com HTTP/2 e HTTP/3: config do nginx, portas TCP e UDP, certificado autoassinado no dev (certs/generate.sh), certificado copiado para deploy/certs no prod e como verificar h2 e h3. Usada por docker:create e docker:tune quando há servidor HTTP.
user-invocable: false
---

# HTTP e HTTPS

O servidor HTTP padrão é o nginx oficial, que já vem com os módulos de HTTP/2 e HTTP/3. Ele sobe com TLS mesmo no dev, porque sem TLS não existe HTTP/2 no navegador nem HTTP/3.

`nginx/default.conf.template`: a imagem troca as variáveis do ambiente (`${HTTPS_PORT}`) e mantém as do nginx (`$host`).

```nginx
server {
    listen 80;
    return 301 https://$host:${HTTPS_PORT}$request_uri;
}

server {
    listen 443 ssl;
    listen 443 quic reuseport;
    http2 on;
    http3 on;

    ssl_certificate     /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    ssl_protocols       TLSv1.3;

    add_header Alt-Svc 'h3=":${HTTPS_PORT}"; ma=86400' always;

    location / {
        proxy_pass http://node:3000;
    }
}
```

O serviço no compose:

```yaml
  nginx:
    container_name: ${COMPOSE_PROJECT_NAME}-nginx
    image: nginx:1-alpine
    environment:
      HTTPS_PORT: ${HTTPS_PORT:-443}
    ports:
      - "${HTTP_PORT:-80}:80"
      - "${HTTPS_PORT:-443}:443"
      - "${HTTPS_PORT:-443}:443/udp"
    volumes:
      - ./nginx:/etc/nginx/templates:ro
      - ./certs:/etc/nginx/certs:ro
```

- **`443/udp`**: o HTTP/3 roda sobre QUIC, que usa UDP. Sem essa porta, o navegador fica no HTTP/2 sem dar erro.
- **`Alt-Svc`**: é por esse cabeçalho que o navegador descobre o HTTP/3. A porta anunciada é a externa (`HTTPS_PORT`).
- **Certificado do dev**: `certs/generate.sh` (versionado) gera um autoassinado para `localhost`:

  ```sh
  #!/bin/sh
  set -eu
  dir="${1:-$(dirname "$0")}"
  domain="${2:-localhost}"
  mkdir -p "$dir"
  openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
    -keyout "$dir/key.pem" -out "$dir/cert.pem" \
    -subj "/CN=$domain" \
    -addext "subjectAltName=DNS:$domain,DNS:*.$domain,IP:127.0.0.1"
  echo "certificado autoassinado em $dir (cert.pem, key.pem)"
  ```

- **Prod**: o `deploy/compose.yaml` monta `./certs:/etc/nginx/certs:ro`, ou seja, `deploy/certs/`. No servidor, o certificado real (`cert.pem` com a cadeia completa, `key.pem`) é copiado para lá. Para simular localmente, gere nessa pasta: `./certs/generate.sh deploy/certs`. O certificado nunca entra na imagem: `certs` e `deploy/certs` vão no dockerignore.
- **Verificar** (o curl do host costuma vir sem HTTP/3, então o teste do h3 roda num container com Debian):

  ```bash
  curl -sk --http2 -o /dev/null -w '%{http_version}\n' https://localhost:${HTTPS_PORT:-443}/   # 2
  curl -skI https://localhost:${HTTPS_PORT:-443}/ | grep -i alt-svc
  docker run --rm --network host debian:trixie-slim sh -c 'apt-get -qq update && apt-get -qq install -y curl >/dev/null \
    && curl -sk --http3-only -o /dev/null -w "%{http_version}\n" https://localhost:'"${HTTPS_PORT:-443}"'/'      # 3
  ```
