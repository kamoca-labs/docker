import assert from 'node:assert'
import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const RULES = path.join(import.meta.dirname, '..', 'rules')

export const VALID = `name: dev-\${APP_NAME:-app}

services:
  node:
    container_name: \${COMPOSE_PROJECT_NAME}-node
    image: node:24-alpine
    user: "\${UID:-1000}:\${GID:-1000}"
    env_file: .env
    volumes:
      - ./:/app
    ports:
      - "\${APP_PORT:-3000}:3000"
  postgres:
    container_name: \${COMPOSE_PROJECT_NAME}-postgres
    image: postgres:18-alpine
    user: "\${UID:-1000}:\${GID:-1000}"
    environment:
      POSTGRES_PASSWORD: \${DB_PASSWORD:-postgres}
    volumes:
      - \${DATA_DIR:-./.data}/postgres:/var/lib/postgresql
`

export type ToolInput = { file_path: string, content?: string, old_string?: string, new_string?: string, replace_all?: boolean }

export type Sandbox = {
  dir: string
  casesLog: string
  run: (rule: string, toolName: string, toolInput: ToolInput) => SpawnSyncReturns<string>
  write: (rule: string, file: string, content: string) => SpawnSyncReturns<string>
}

export function sandbox(): Sandbox {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docker-hooks-'))
  const casesLog = path.join(dir, 'cases.jsonl')
  const run = (rule: string, toolName: string, toolInput: ToolInput) => spawnSync('node', [path.join(RULES, `${rule}.ts`)], {
    input: JSON.stringify({ tool_name: toolName, tool_input: toolInput, cwd: dir }),
    encoding: 'utf8',
    env: { ...process.env, HOOK_CASES_LOG: casesLog },
  })
  const write = (rule: string, file: string, content: string) => run(rule, 'Write', { file_path: file, content })
  return { dir, casesLog, run, write }
}

export function allowed(result: SpawnSyncReturns<string>) {
  assert.strictEqual(result.status, 0, result.stderr)
}

export function denied(result: SpawnSyncReturns<string>, pattern: RegExp) {
  assert.strictEqual(result.status, 2, `expected a denial matching ${pattern}`)
  assert.match(result.stderr, pattern)
}
