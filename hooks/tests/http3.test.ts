import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'http3'

const MODERN = `server {
    listen 443 ssl;
    listen 443 quic reuseport;
    http2 on;
    http3 on;
    add_header Alt-Svc 'h3=":\${HTTPS_PORT}"; ma=86400' always;
}
`

const NGINX_PORTS = '    ports:\n      - "${HTTPS_PORT:-443}:443"\n      - "${HTTPS_PORT:-443}:443/udp"\n'

test('aceita nginx com HTTP/2, HTTP/3 e Alt-Svc', () => {
  allowed(sandbox().write(RULE, 'nginx/default.conf.template', MODERN))
  allowed(sandbox().write(RULE, 'deploy/nginx/default.conf', MODERN))
})

test('nega nginx com TLS só em HTTP/1.1', () => {
  denied(sandbox().write(RULE, 'nginx/default.conf.template', 'server {\n    listen 443 ssl;\n}\n'), /quic.*http2 on.*http3 on.*Alt-Svc/s)
})

test('nega nginx sem o Alt-Svc, que é como o navegador descobre o HTTP/3', () => {
  denied(sandbox().write(RULE, 'nginx/default.conf', MODERN.replace(/ +add_header Alt-Svc.*\n/, '')), /Alt-Svc/)
})

test('edit que tira o http3 on é negado', () => {
  const box = sandbox()
  const file = path.join(box.dir, 'default.conf')
  fs.writeFileSync(file, MODERN)
  denied(box.run(RULE, 'Edit', { file_path: file, old_string: '    http3 on;\n', new_string: '' }), /http3 on/)
})

test('server só em HTTP, sem TLS, passa', () => {
  allowed(sandbox().write(RULE, 'nginx/default.conf', 'server {\n    listen 80;\n    return 301 https://$host$request_uri;\n}\n'))
})

test('aceita compose que publica 443 em TCP e UDP', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID.replace('    ports:\n      - "${APP_PORT:-3000}:3000"\n', NGINX_PORTS)))
})

test('nega compose que publica 443 só em TCP', () => {
  const tcpOnly = NGINX_PORTS.replace(/ +- ".*443\/udp"\n/, '')
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('    ports:\n      - "${APP_PORT:-3000}:3000"\n', tcpOnly)), /443\/udp/)
})
