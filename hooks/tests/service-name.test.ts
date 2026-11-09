import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'service-name'

test('accepts every service named after its role', () => {
  const roles = VALID.replace('  node:', '  backend:').replace('  postgres:', '  database:')
  allowed(sandbox().write(RULE, 'compose.yaml', roles))
})

test('accepts a service named after the technology when the user asks for it', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID))
})

test('denies db, front and other abbreviations of a role', () => {
  const short = VALID.replace('  postgres:', '  db:').replace('  node:', '  front:')
  denied(sandbox().write(RULE, 'compose.yaml', short), /front, db\. Use the full role/)
})
