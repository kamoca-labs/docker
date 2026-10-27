import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'compose-name'

test('accepts a compose file with name: as the first key', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', `# dev\n${VALID}`))
})

test('denies a compose file without name:', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace(/^name:.*\n/, '')), /first key/)
})

test('denies name: after services:', () => {
  const content = `${VALID.replace(/^name:.*\n/, '')}name: app\n`
  denied(sandbox().write(RULE, 'docker-compose.yml', content), /before `services:`/)
})

test('denies an edit that removes name:', () => {
  const box = sandbox()
  const file = path.join(box.dir, 'compose.yaml')
  fs.writeFileSync(file, VALID)
  denied(box.run(RULE, 'Edit', { file_path: file, old_string: 'name: dev-${APP_NAME:-app}\n', new_string: '' }), /name:/)
})

test('a file that is not a compose file passes', () => {
  allowed(sandbox().write(RULE, 'config.yaml', 'services: {}'))
})

test('denies a dev compose file without the dev- prefix in name', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('name: dev-${APP_NAME:-app}', 'name: ${APP_NAME:-app}-dev')), /dev-/)
})

test('a prod compose file in deploy/ has no dev- prefix', () => {
  allowed(sandbox().write(RULE, 'deploy/compose.yaml', VALID.replace('name: dev-${APP_NAME:-app}', 'name: ${APP_NAME:-app}')))
})
