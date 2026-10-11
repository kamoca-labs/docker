import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { allowed, denied, sandbox, VALID } from './helpers.ts'

const RULE = 'compose-name'

test('aceita compose com name: como primeira chave', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', `# dev\n${VALID}`))
})

test('nega compose sem name:', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace(/^name:.*\n/, '')), /primeira chave/)
})

test('nega name: depois de services:', () => {
  const content = `${VALID.replace(/^name:.*\n/, '')}name: app\n`
  denied(sandbox().write(RULE, 'docker-compose.yml', content), /antes de `services:`/)
})

test('edit que remove o name: é negado', () => {
  const box = sandbox()
  const file = path.join(box.dir, 'compose.yaml')
  fs.writeFileSync(file, VALID)
  denied(box.run(RULE, 'Edit', { file_path: file, old_string: 'name: dev-${APP_NAME:-app}\n', new_string: '' }), /name:/)
})

test('arquivo que não é compose passa', () => {
  allowed(sandbox().write(RULE, 'config.yaml', 'services: {}'))
})

test('nega compose de dev sem o prefixo dev- no name', () => {
  denied(sandbox().write(RULE, 'compose.yaml', VALID.replace('name: dev-${APP_NAME:-app}', 'name: ${APP_NAME:-app}-dev')), /dev-/)
})

test('compose de prod no deploy/ não leva o prefixo dev-', () => {
  allowed(sandbox().write(RULE, 'deploy/compose.yaml', VALID.replace('name: dev-${APP_NAME:-app}', 'name: ${APP_NAME:-app}')))
})
