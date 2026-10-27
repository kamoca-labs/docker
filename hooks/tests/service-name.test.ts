import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'service-name'

test('accepts a service named after the technology', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID))
})

test('denies app, db and other generic names', () => {
  const generic = VALID.replace('  node:', '  app:').replace('  postgres:', '  db:')
  denied(sandbox().write(RULE, 'compose.yaml', generic), /app, db\. Use the technology name/)
})
