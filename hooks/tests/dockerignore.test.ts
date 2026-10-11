import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { allowed, denied, sandbox } from './helpers.ts'

const RULE = 'dockerignore'
const IGNORE = '**/.env\n.git\n.data/\ndeploy/data\nnode_modules\n'

test('aceita ignore com .env, .git e pastas de dados', () => {
  allowed(sandbox().write(RULE, 'deploy/Dockerfile.dockerignore', IGNORE))
  allowed(sandbox().write(RULE, '.dockerignore', IGNORE))
})

test('nega ignore que deixa .env ou dados entrar na imagem', () => {
  denied(sandbox().write(RULE, 'deploy/Dockerfile.dockerignore', 'node_modules\n.git\n'), /\*\*\/\.env, \.data, deploy\/data/)
})

test('edit que tira o .env do ignore é negado', () => {
  const box = sandbox()
  const file = path.join(box.dir, '.dockerignore')
  fs.writeFileSync(file, IGNORE)
  denied(box.run(RULE, 'Edit', { file_path: file, old_string: '**/.env\n', new_string: '' }), /\.env/)
})

test('nega Dockerfile sem ignore e aceita depois que o ignore existe', () => {
  const box = sandbox()
  denied(box.write(RULE, 'deploy/Dockerfile', 'FROM node:24-alpine'), /Dockerfile\.dockerignore/)
  fs.mkdirSync(path.join(box.dir, 'deploy'))
  fs.writeFileSync(path.join(box.dir, 'deploy', 'Dockerfile.dockerignore'), IGNORE)
  allowed(box.write(RULE, 'deploy/Dockerfile', 'FROM node:24-alpine'))
})
