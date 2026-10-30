import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'compose-name'

test('accepts a dev compose file with name: dev- as the first key', () => {
  allowed(sandbox().write(RULE, 'compose.dev.yaml', `# dev\n${VALID}`))
})

test('denies a dev compose file without name:', () => {
  denied(sandbox().write(RULE, 'compose.dev.yaml', VALID.replace(/^name:.*\n/, '')), /first key/)
})

test('denies name: after services:', () => {
  const content = `${VALID.replace(/^name:.*\n/, '')}name: app\n`
  denied(sandbox().write(RULE, 'compose.prod.yaml', content), /before `services:`/)
})

test('denies an edit that removes name:', () => {
  const box = sandbox()
  const file = path.join(box.dir, 'compose.dev.yaml')
  fs.writeFileSync(file, VALID)
  denied(box.run(RULE, 'Edit', { file_path: file, old_string: 'name: dev-${APP_NAME:-app}\n', new_string: '' }), /name:/)
})

test('a file that is not a compose file passes', () => {
  allowed(sandbox().write(RULE, 'config.yaml', 'services: {}'))
})

test('denies a dev compose file without the dev- prefix in name', () => {
  denied(sandbox().write(RULE, 'compose.dev.yaml', VALID.replace('name: dev-${APP_NAME:-app}', 'name: ${APP_NAME:-app}-dev')), /dev-/)
})

test('a prod compose file has no dev- prefix', () => {
  allowed(sandbox().write(RULE, 'compose.prod.yaml', VALID.replace('name: dev-${APP_NAME:-app}', 'name: ${APP_NAME:-app}')))
})

test('the base file declares no name:, because it does not start alone', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', VALID.replace(/^name:.*\n\n?/, '')))
})

test('a compose file with a non-standard name still needs name:', () => {
  denied(sandbox().write(RULE, 'docker-compose.yml', VALID.replace(/^name:.*\n/, '')), /first key/)
})
