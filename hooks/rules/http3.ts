import path from 'node:path'
import { composeContent, contentAfter, deny, field, readInput, services, targetPath, values } from '../lib.ts'

const NGINX_CONF = /\.conf(\.template)?$/
const MODERN_TLS: [RegExp, string][] = [
  [/listen\s+[^;]*\bquic\b/, 'listen 443 quic reuseport;'],
  [/\bhttp2\s+on\s*;/, 'http2 on;'],
  [/\bhttp3\s+on\s*;/, 'http3 on;'],
  [/add_header\s+Alt-Svc\b/i, `add_header Alt-Svc 'h3=":\${HTTPS_PORT}"; ma=86400' always;`],
]

const input = readInput()
const conf = NGINX_CONF.test(path.basename(targetPath(input))) ? contentAfter(input) : null

if (conf && /listen\s+[^;]*\bssl\b/.test(conf)) {
  const missing = MODERN_TLS.filter(([pattern]) => !pattern.test(conf)).map(([, directive]) => directive)
  if (missing.length) {
    deny('http3', `Server com TLS sem HTTP/2 e HTTP/3. Falta: ${missing.join(' ')}`)
  }
}

const yaml = composeContent(input)
const tcpOnly = yaml === null ? [] : services(yaml)
  .filter((service) => {
    const ports = values(field(service, 'ports'))
    return ports.some((port) => /:443(\/tcp)?$/.test(port)) && !ports.some((port) => /:443\/udp$/.test(port))
  })
  .map((service) => service.key)

if (tcpOnly.length) {
  deny('http3', `Serviço publica a 443 só em TCP: ${tcpOnly.join(', ')}. O HTTP/3 (QUIC) usa UDP: publique também \`"\${HTTPS_PORT:-443}:443/udp"\`.`)
}
