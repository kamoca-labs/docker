import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'single-env'

test('aceita env_file .env, também em long syntax', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID))
  allowed(sandbox().write(RULE, 'deploy/compose.yaml', VALID.replace('env_file: .env', 'env_file:\n      - path: ./.env\n        required: false')))
})

test('nega env_file que não é o .env ao lado do compose', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('env_file: .env', 'env_file:\n      - .env\n      - .env.local')), /\.env\.local/)
  denied(sandbox().write(RULE, 'deploy/compose.yaml', VALID.replace('env_file: .env', 'env_file: ../.env')), /\.\.\/\.env/)
})

test('nega criar .env.dev ou .env.production', () => {
  denied(sandbox().write(RULE, '.env.dev', 'A=1'), /um \.env por ambiente/)
  denied(sandbox().write(RULE, '.env.production', 'A=1'), /um \.env por ambiente/)
})

test('aceita o .env do dev, o do deploy e o .env.example', () => {
  allowed(sandbox().write(RULE, '.env', 'A=1'))
  allowed(sandbox().write(RULE, 'deploy/.env', 'A=1'))
  allowed(sandbox().write(RULE, '.env.example', 'A='))
})
