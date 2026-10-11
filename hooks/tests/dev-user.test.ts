import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'dev-user'

test('aceita dev com user do host em todo serviço que grava na pasta local', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID))
})

test('nega serviço de dev com bind mount sem user', () => {
  const noUser = VALID.replace(/( {4}image: postgres.*\n) {4}user: .*\n/, '$1')
  denied(sandbox().write(RULE, 'compose.yaml', noUser), /: postgres\. .*id -u/)
})

test('nega user fixo, que não vem do UID e GID do host', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replaceAll('"${UID:-1000}:${GID:-1000}"', '"1000:1000"')), /node, postgres/)
})

test('serviço que só monta pasta local em leitura não precisa de user', () => {
  const nginx = 'name: dev-x\nservices:\n  nginx:\n    image: nginx:1-alpine\n    volumes:\n      - ./nginx:/etc/nginx/templates:ro\n      - type: bind\n        source: ./certs\n        target: /etc/nginx/certs\n        read_only: true\n'
  allowed(sandbox().write(RULE, 'compose.yaml', nginx))
  denied(sandbox().write(RULE, 'compose.yaml', nginx.replace(':ro', '')), /nginx/)
})

test('serviço sem volume e compose de prod não precisam de user', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', 'name: x\nservices:\n  redis:\n    image: redis:7-alpine\n'))
  allowed(sandbox().write(RULE, 'deploy/compose.yaml', VALID.replaceAll(/ {4}user: .*\n/g, '')))
})
