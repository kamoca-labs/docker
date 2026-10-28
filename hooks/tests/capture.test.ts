import assert from 'node:assert'
import fs from 'node:fs'
import { test } from 'node:test'
import { allowed, sandbox, VALID } from './helpers.ts'

test('a real denial becomes a ready case for cases.json', () => {
  const box = sandbox()
  box.write('single-env', '.env.dev', 'A=1')
  const [captured] = fs.readFileSync(box.casesLog, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  assert.strictEqual(captured.plugin, 'docker')
  assert.strictEqual(captured.origin, 'real')
  assert.strictEqual(captured.tool_name, 'Write')
  assert.strictEqual(captured.tool_input.file_path, '.env.dev')
  assert.deepStrictEqual(captured.deny, ['single-env'])
})

test('an allowed call creates no case', () => {
  const box = sandbox()
  allowed(box.write('single-env', 'compose.dev.yaml', VALID))
  assert.ok(!fs.existsSync(box.casesLog))
})
