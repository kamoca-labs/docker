import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'service-name'

test('accepts a service with code named after its role', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID.replace('  node:', '  backend:')))
})

test('accepts a service with code named after the technology when the user asks for it', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID))
})

test('denies db, cache and other generic names of infrastructure', () => {
  const generic = VALID.replace('  postgres:', '  db:').replace('  node:', '  cache:')
  denied(sandbox().write(RULE, 'compose.yaml', generic), /cache, db\. Use the technology name/)
})
