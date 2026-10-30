import assert from 'node:assert'
import { test } from 'node:test'
import { composeRole } from '../lib.ts'

test('compose.yaml is the base, and the suffix gives the environment role', () => {
  assert.strictEqual(composeRole('/app/compose.yaml'), 'base')
  assert.strictEqual(composeRole('/app/compose.dev.yaml'), 'dev')
  assert.strictEqual(composeRole('/app/compose.prod.yaml'), 'prod')
})

test('a non-standard name has no role', () => {
  for (const name of ['compose.yml', 'docker-compose.yml', 'compose.staging.yaml', 'Dockerfile', 'compose.dev.yml']) {
    assert.strictEqual(composeRole(`/app/${name}`), null, name)
  }
})
