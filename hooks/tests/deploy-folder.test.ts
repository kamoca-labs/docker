import { test } from 'node:test'
import { allowed, denied, sandbox } from './helpers.ts'

const RULE = 'deploy-folder'

test('denies a prod file outside deploy/', () => {
  denied(sandbox().write(RULE, 'docker-compose.prod.yml', 'name: x'), /\.\/deploy/)
  denied(sandbox().write(RULE, 'Dockerfile.production', 'FROM x'), /\.\/deploy/)
})

test('accepts prod inside deploy/ and dev in the root', () => {
  allowed(sandbox().write(RULE, 'deploy/compose.prod.yaml', 'name: x'))
  allowed(sandbox().write(RULE, 'compose.yaml', 'name: x'))
  allowed(sandbox().write(RULE, 'src/product.ts', ''))
})
