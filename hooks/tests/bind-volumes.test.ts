import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'bind-volumes'

test('accepts relative, absolute and variable bind mounts and tmpfs', () => {
  const volumes = `      - ./src:/app/src:ro\n      - /srv/logs:/logs\n      - type: bind\n        source: ./conf\n        target: /conf\n      - type: tmpfs\n        target: /tmp`
  allowed(sandbox().write(RULE, 'compose.yaml', VALID.replace('      - ./:/app', volumes)))
})

test('denies a named volume in a service', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('${DATA_DIR:-./docker/postgres/data/dev}/postgres', 'pgdata')), /postgres: pgdata/)
})

test('denies an anonymous volume', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('      - ./:/app', '      - ./:/app\n      - /app/node_modules')), /node_modules/)
})

test('denies long syntax type: volume', () => {
  const volume = '      - type: volume\n        source: data\n        target: /data'
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('      - ./:/app', volume)), /type: volume/)
})

test('denies named volumes declared at the top level', () => {
  denied(sandbox().write(RULE, 'compose.yaml', `${VALID}\nvolumes:\n  pgdata:\n`), /top level/)
})
