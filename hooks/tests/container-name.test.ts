import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { allowed, BASE, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'container-name'

test('accepts container_name = project name + service', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', BASE))
})

test('denies a service without container_name', () => {
  denied(sandbox().write(RULE, 'compose.yaml', BASE.replace(/ {4}container_name: .*-postgres\n/, '')), /postgres → \$\{COMPOSE_PROJECT_NAME\}-postgres/)
})

test('denies a fixed container_name or one that does not end with the service name', () => {
  denied(sandbox().write(RULE, 'compose.yaml', BASE.replace('${COMPOSE_PROJECT_NAME}-node', 'my-node')), /node →/)
  denied(sandbox().write(RULE, 'compose.yaml', BASE.replace('${COMPOSE_PROJECT_NAME}-node', '${COMPOSE_PROJECT_NAME}-api')), /node →/)
})

test('dev and prod do not repeat container_name for services that the base file already declares', () => {
  const box = sandbox()
  fs.writeFileSync(path.join(box.dir, 'compose.yaml'), BASE)
  const extra = 'name: dev-x\nservices:\n  node:\n    user: "1000:1000"\n  postgres:\n    ports: []\n'
  allowed(box.write(RULE, 'compose.dev.yaml', extra))
  allowed(box.write(RULE, 'compose.prod.yaml', extra))
})

test('dev and prod require container_name in a service that the base file does not declare', () => {
  const box = sandbox()
  fs.writeFileSync(path.join(box.dir, 'compose.yaml'), BASE)
  const withRedis = 'name: x\nservices:\n  node:\n    ports: []\n  redis:\n    image: redis:8-alpine\n'
  denied(box.write(RULE, 'compose.dev.yaml', withRedis), /redis → \$\{COMPOSE_PROJECT_NAME\}-redis/)
  allowed(box.write(RULE, 'compose.prod.yaml', withRedis.replace('image:', 'container_name: ${COMPOSE_PROJECT_NAME}-redis\n    image:')))
})

test('a dev file without the base file next to it requires container_name in every service', () => {
  denied(sandbox().write(RULE, 'compose.dev.yaml', VALID.replace(/ {4}container_name: .*-postgres\n/, '')), /postgres/)
})
