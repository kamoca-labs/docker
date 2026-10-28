import { test } from 'node:test'
import { allowed, BASE, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'single-env'
const LONG = 'env_file:\n      - path: ./.env\n        required: false'

test('dev reads the .env, also in long syntax, and prod reads the .env.prod', () => {
  allowed(sandbox().write(RULE, 'compose.dev.yaml', VALID))
  allowed(sandbox().write(RULE, 'compose.dev.yaml', VALID.replace('env_file: .env', LONG)))
  allowed(sandbox().write(RULE, 'compose.prod.yaml', VALID.replace('env_file: .env', LONG.replace('./.env', '.env.prod'))))
})

test('denies an env_file that is not the .env of the environment', () => {
  denied(sandbox().write(RULE, 'compose.dev.yaml', VALID.replace('env_file: .env', 'env_file:\n      - .env\n      - .env.local')), /\.env\.local/)
  denied(sandbox().write(RULE, 'compose.dev.yaml', VALID.replace('env_file: .env', 'env_file: ../.env')), /\.\.\/\.env/)
  denied(sandbox().write(RULE, 'compose.prod.yaml', VALID), /env_file is not the \.env\.prod/)
  denied(sandbox().write(RULE, 'compose.dev.yaml', VALID.replace('env_file: .env', 'env_file: .env.prod')), /\.env\.prod/)
})

test('the base file declares no env_file, because each environment reads its own', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', BASE))
  denied(sandbox().write(RULE, 'compose.yaml', `${BASE}    env_file: .env\n`), /\.env/)
})

test('denies creating .env.dev, .env.local or .env.production', () => {
  for (const name of ['.env.dev', '.env.local', '.env.production']) denied(sandbox().write(RULE, name, 'A=1'), /one \.env per environment/)
})

test('accepts the dev .env, the .env.prod and the .env.example', () => {
  for (const name of ['.env', '.env.prod', '.env.example']) allowed(sandbox().write(RULE, name, 'A=1'))
})
