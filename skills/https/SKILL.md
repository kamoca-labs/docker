---
name: https
description: HTTP server with HTTP/2 and HTTP/3. Covers the nginx config, TCP and UDP ports, the self-signed certificate in dev (certs/generate.sh), the certificate copied to deploy/certs in prod, and how to check h2 and h3. Used by docker:create and docker:tune when there is an HTTP server.
user-invocable: false
---

# HTTP and HTTPS

The default HTTP server is the official nginx, which includes the HTTP/2 and HTTP/3 modules. It starts with TLS even in dev, because browsers do not use HTTP/2 or HTTP/3 without TLS.

`nginx/default.conf.template`: the image replaces the environment variables (`${HTTPS_PORT}`) and keeps the nginx variables (`$host`).

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

The service in the compose file:

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

- **`443/udp`**: HTTP/3 runs on QUIC, which uses UDP. Without this port, the browser stays on HTTP/2 and shows no error.
- **`Alt-Svc`**: the browser finds HTTP/3 through this header. The announced port is the external one (`HTTPS_PORT`).
- **Dev certificate**: `certs/generate.sh` (in version control) generates a self-signed certificate for `localhost`:

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

- **Prod**: `deploy/compose.yaml` mounts `./certs:/etc/nginx/certs:ro`, which is `deploy/certs/`. On the server, copy the real certificate there (`cert.pem` with the full chain, and `key.pem`). To simulate it locally, generate the certificate in that folder with `./certs/generate.sh deploy/certs`. The certificate never enters the image: put `certs` and `deploy/certs` in the dockerignore.
- **Check** (the host curl usually has no HTTP/3, so run the h3 test in a Debian container):

  ```bash
  curl -sk --http2 -o /dev/null -w '%{http_version}\n' https://localhost:${HTTPS_PORT:-443}/   # 2
  curl -skI https://localhost:${HTTPS_PORT:-443}/ | grep -i alt-svc
  docker run --rm --network host debian:trixie-slim sh -c 'apt-get -qq update && apt-get -qq install -y curl >/dev/null \
    && curl -sk --http3-only -o /dev/null -w "%{http_version}\n" https://localhost:'"${HTTPS_PORT:-443}"'/'      # 3
  ```
