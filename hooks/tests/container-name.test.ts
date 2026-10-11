import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'container-name'

test('aceita container_name = name do projeto + serviço', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID))
})

test('nega serviço sem container_name', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace(/ {4}container_name: .*-postgres\n/, '')), /postgres → \$\{COMPOSE_PROJECT_NAME\}-postgres/)
})

test('nega container_name fixo ou que não termina no nome do serviço', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('${COMPOSE_PROJECT_NAME}-node', 'meu-node')), /node →/)
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('${COMPOSE_PROJECT_NAME}-node', '${COMPOSE_PROJECT_NAME}-api')), /node →/)
})
