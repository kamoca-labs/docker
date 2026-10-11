import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'service-name'

test('aceita serviço com nome da tecnologia', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID))
})

test('nega app, db e outros nomes genéricos', () => {
  const generic = VALID.replace('  node:', '  app:').replace('  postgres:', '  db:')
  denied(sandbox().write(RULE, 'compose.yaml', generic), /app, db\. Use o nome da tecnologia/)
})
