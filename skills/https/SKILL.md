---
name: https
description: HTTP server with HTTP/2 and HTTP/3. Covers the nginx config in docker/nginx, TCP and UDP ports, the self-signed certificate in dev (docker/nginx/certs/generate.sh), the certificate copied to docker/nginx/certs/prod in prod, and how to check h2 and h3. Used by docker:create and docker:tune when there is an HTTP server.
user-invocable: false
---

# HTTP and HTTPS

The default HTTP server is the official nginx, which includes the HTTP/2 and HTTP/3 modules. It starts with TLS even in dev, because browsers do not use HTTP/2 or HTTP/3 without TLS.

`docker/nginx/default.conf.template`: the image replaces the environment variables (`${HTTPS_PORT}`) and keeps the nginx variables (`$host`).

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

The Dockerfile (`docker/nginx/Dockerfile`) puts the configuration inside the image. A new image recreates the container by itself, so nobody recreates nginx by hand.

```dockerfile
FROM nginx:1-alpine AS base
COPY default.conf.template /etc/nginx/templates/default.conf.template
FROM base AS dev
FROM base AS prod
```

The service in `compose.yaml` (the context is `docker/nginx`, so the `dockerfile` is only `Dockerfile`):

```yaml
  nginx:
    container_name: ${COMPOSE_PROJECT_NAME}-nginx
    build:
      context: docker/nginx
      dockerfile: Dockerfile
    environment:
      HTTPS_PORT: ${HTTPS_PORT:-443}
    ports:
      - "${HTTP_PORT:-80}:80"
      - "${HTTPS_PORT:-443}:443"
      - "${HTTPS_PORT:-443}:443/udp"
```

Each environment compose file has only the `target` and the certificate of the environment:

```yaml
  nginx:
    build:
      target: dev
    volumes:
      - ./docker/nginx/certs/dev:/etc/nginx/certs:ro
```

`compose.prod.yaml` has the same, with `target: prod` and `./docker/nginx/certs/prod`.

- **`443/udp`**: HTTP/3 runs on QUIC, which uses UDP. Without this port, the browser stays on HTTP/2 and shows no error.
- **`Alt-Svc`**: the browser finds HTTP/3 through this header. The announced port is the external one (`HTTPS_PORT`).
- **Dev certificate**: `docker/nginx/certs/generate.sh` (in version control) generates a self-signed certificate for `localhost`:

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
  echo "self-signed certificate in $dir (cert.pem, key.pem)"
  ```

- **Prod**: `compose.prod.yaml` mounts `./docker/nginx/certs/prod:/etc/nginx/certs:ro`. On the server, copy the real certificate there (`cert.pem` with the full chain, and `key.pem`). To simulate it locally, generate the certificate in that folder with `docker/nginx/certs/generate.sh docker/nginx/certs/prod`. The certificate never enters the image: put `**/certs` in the dockerignore.
- **Check** (the host curl usually has no HTTP/3, so run the h3 test in a Debian container):

  ```bash
  curl -sk --http2 -o /dev/null -w '%{http_version}\n' https://localhost:${HTTPS_PORT:-443}/   # 2
  curl -skI https://localhost:${HTTPS_PORT:-443}/ | grep -i alt-svc
  docker run --rm --network host debian:trixie-slim sh -c 'apt-get -qq update && apt-get -qq install -y curl >/dev/null \
    && curl -sk --http3-only -o /dev/null -w "%{http_version}\n" https://localhost:'"${HTTPS_PORT:-443}"'/'      # 3
  ```
