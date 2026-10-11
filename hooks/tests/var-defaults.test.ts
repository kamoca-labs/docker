import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'var-defaults'

test('aceita default, obrigatório e $$ escapado', () => {
  const extra = '    command: sh -c "echo $$HOME"\n    environment:\n      SECRET: ${SECRET:?defina SECRET no .env}\n'
  allowed(sandbox().write(RULE, 'compose.yaml', VALID.replace("    build: .\n", () => `    build: .\n${extra}`)))
})

test('nega ${VAR} e $VAR sem default', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('${APP_PORT:-3000}', '${APP_PORT}')), /APP_PORT:-valor/)
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('${DB_PASSWORD:-postgres}', '$DB_PASSWORD')), /DB_PASSWORD/)
})

test('ignora variável em comentário', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', `# porta: \${APP_PORT}\n${VALID}`))
})
