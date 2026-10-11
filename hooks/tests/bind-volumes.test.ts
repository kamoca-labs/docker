import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'bind-volumes'

test('aceita bind mount relativo, absoluto, com variável e tmpfs', () => {
  const volumes = `      - ./src:/app/src:ro\n      - /srv/logs:/logs\n      - type: bind\n        source: ./conf\n        target: /conf\n      - type: tmpfs\n        target: /tmp`
  allowed(sandbox().write(RULE, 'compose.yaml', VALID.replace('      - ./:/app', volumes)))
})

test('nega volume nomeado no serviço', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('${DATA_DIR:-./.data}/postgres', 'pgdata')), /postgres: pgdata/)
})

test('nega volume anônimo', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('      - ./:/app', '      - ./:/app\n      - /app/node_modules')), /node_modules/)
})

test('nega long syntax type: volume', () => {
  const volume = '      - type: volume\n        source: data\n        target: /data'
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('      - ./:/app', volume)), /type: volume/)
})

test('nega volumes nomeados declarados no topo', () => {
  denied(sandbox().write(RULE, 'compose.yaml', `${VALID}\nvolumes:\n  pgdata:\n`), /topo/)
})
