import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'single-env'

test('accepts env_file .env, also in long syntax', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID))
  allowed(sandbox().write(RULE, 'deploy/compose.yaml', VALID.replace('env_file: .env', 'env_file:\n      - path: ./.env\n        required: false')))
})

test('denies an env_file that is not the .env next to the compose file', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('env_file: .env', 'env_file:\n      - .env\n      - .env.local')), /\.env\.local/)
  denied(sandbox().write(RULE, 'deploy/compose.yaml', VALID.replace('env_file: .env', 'env_file: ../.env')), /\.\.\/\.env/)
})

test('denies creating .env.dev or .env.production', () => {
  denied(sandbox().write(RULE, '.env.dev', 'A=1'), /one \.env per environment/)
  denied(sandbox().write(RULE, '.env.production', 'A=1'), /one \.env per environment/)
})

test('accepts the dev .env, the deploy .env and .env.example', () => {
  allowed(sandbox().write(RULE, '.env', 'A=1'))
  allowed(sandbox().write(RULE, 'deploy/.env', 'A=1'))
  allowed(sandbox().write(RULE, '.env.example', 'A='))
})
