import { test } from 'node:test'
import { allowed, denied, sandbox } from './helpers.ts'

const RULE = 'deploy-folder'

test('nega arquivo de prod fora do deploy/', () => {
  denied(sandbox().write(RULE, 'docker-compose.prod.yml', 'name: x'), /\.\/deploy/)
  denied(sandbox().write(RULE, 'Dockerfile.production', 'FROM x'), /\.\/deploy/)
})

test('aceita prod dentro do deploy/ e dev na raiz', () => {
  allowed(sandbox().write(RULE, 'deploy/compose.prod.yaml', 'name: x'))
  allowed(sandbox().write(RULE, 'compose.yaml', 'name: x'))
  allowed(sandbox().write(RULE, 'src/product.ts', ''))
})
