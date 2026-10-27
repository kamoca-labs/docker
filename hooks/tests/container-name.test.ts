import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'container-name'

test('accepts container_name = project name + service', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID))
})

test('denies a service without container_name', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace(/ {4}container_name: .*-postgres\n/, '')), /postgres → \$\{COMPOSE_PROJECT_NAME\}-postgres/)
})

test('denies a fixed container_name or one that does not end with the service name', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('${COMPOSE_PROJECT_NAME}-node', 'my-node')), /node →/)
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('${COMPOSE_PROJECT_NAME}-node', '${COMPOSE_PROJECT_NAME}-api')), /node →/)
})
