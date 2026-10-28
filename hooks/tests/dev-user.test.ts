import { test } from 'node:test'
import { allowed, BASE, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'dev-user'

test('accepts dev with the host user in every service that writes to the local folder', () => {
  allowed(sandbox().write(RULE, 'compose.dev.yaml', VALID))
})

test('denies a dev service with a bind mount and no user', () => {
  const noUser = VALID.replace(/( {4}image: postgres.*\n) {4}user: .*\n/, '$1')
  denied(sandbox().write(RULE, 'compose.dev.yaml', noUser), /: postgres\. .*id -u/)
})

test('denies a fixed user that does not come from the host UID and GID', () => {
  denied(sandbox().write(RULE, 'compose.dev.yaml', VALID.replaceAll('"${UID:-1000}:${GID:-1000}"', '"1000:1000"')), /node, postgres/)
})

test('a service that mounts a local folder read-only needs no user', () => {
  const nginx = 'name: dev-x\nservices:\n  nginx:\n    image: nginx:1-alpine\n    volumes:\n      - ./docker/nginx:/etc/nginx/templates:ro\n      - type: bind\n        source: ./docker/nginx/certs/dev\n        target: /etc/nginx/certs\n        read_only: true\n'
  allowed(sandbox().write(RULE, 'compose.dev.yaml', nginx))
  denied(sandbox().write(RULE, 'compose.dev.yaml', nginx.replace(':ro', '')), /nginx/)
})

test('a service without volumes needs no user', () => {
  allowed(sandbox().write(RULE, 'compose.dev.yaml', 'name: x\nservices:\n  redis:\n    image: redis:7-alpine\n'))
})

test('prod and base need no user', () => {
  const noUser = VALID.replaceAll(/ {4}user: .*\n/g, '')
  allowed(sandbox().write(RULE, 'compose.prod.yaml', noUser))
  allowed(sandbox().write(RULE, 'compose.yaml', noUser))
  allowed(sandbox().write(RULE, 'compose.yaml', BASE))
})
