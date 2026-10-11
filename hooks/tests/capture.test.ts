import assert from 'node:assert'
import fs from 'node:fs'
import { test } from 'node:test'
import { allowed, sandbox, VALID } from './helpers.ts'

test('negação real vira caso pronto para o cases.json', () => {
  const box = sandbox()
  box.write('single-env', '.env.dev', 'A=1')
  const [captured] = fs.readFileSync(box.casesLog, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  assert.strictEqual(captured.plugin, 'docker')
  assert.strictEqual(captured.origin, 'real')
  assert.strictEqual(captured.tool_name, 'Write')
  assert.strictEqual(captured.tool_input.file_path, '.env.dev')
  assert.deepStrictEqual(captured.deny, ['single-env'])
})

test('chamada liberada não gera caso', () => {
  const box = sandbox()
  allowed(box.write('single-env', 'compose.yaml', VALID))
  assert.ok(!fs.existsSync(box.casesLog))
})
