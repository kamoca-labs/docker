import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'var-defaults'

test('accepts a default, a required variable and an escaped $$', () => {
  const extra = '    command: sh -c "echo $$HOME"\n    environment:\n      SECRET: ${SECRET:?set SECRET in the .env}\n'
  allowed(sandbox().write(RULE, 'compose.yaml', VALID.replace("    build: .\n", () => `    build: .\n${extra}`)))
})

test('denies ${VAR} and $VAR without a default', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('${APP_PORT:-3000}', '${APP_PORT}')), /APP_PORT:-value/)
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('${DB_PASSWORD:-postgres}', '$DB_PASSWORD')), /DB_PASSWORD/)
})

test('ignores a variable in a comment', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', `# port: \${APP_PORT}\n${VALID}`))
})
