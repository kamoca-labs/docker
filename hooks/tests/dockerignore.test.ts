import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { allowed, denied, sandbox } from './helpers.ts'

const RULE = 'dockerignore'
const IGNORE = '**/.env\n.env.prod\n.git\n**/data\n**/certs\nnode_modules\n'

test('accepts an ignore file with .env, .git and the data and certificate folders', () => {
  allowed(sandbox().write(RULE, 'docker/backend/Dockerfile.dockerignore', IGNORE))
})

test('denies an ignore file that lets .env, data or a certificate into the image', () => {
  denied(sandbox().write(RULE, 'docker/backend/Dockerfile.dockerignore', 'node_modules\n.git\n'), /\*\*\/\.env, \.env\.prod, \*\*\/data, \*\*\/certs/)
})

test('denies an edit that removes .env from the ignore file', () => {
  const box = sandbox()
  const file = path.join(box.dir, 'Dockerfile.dockerignore')
  fs.writeFileSync(file, IGNORE)
  denied(box.run(RULE, 'Edit', { file_path: file, old_string: '**/.env\n', new_string: '' }), /\.env/)
})

test('denies a Dockerfile without an ignore file and accepts it after the ignore file exists', () => {
  const box = sandbox()
  denied(box.write(RULE, 'docker/postgres/Dockerfile', 'FROM postgres:18-alpine'), /Dockerfile\.dockerignore/)
  fs.mkdirSync(path.join(box.dir, 'docker', 'postgres'), { recursive: true })
  fs.writeFileSync(path.join(box.dir, 'docker', 'postgres', 'Dockerfile.dockerignore'), IGNORE)
  allowed(box.write(RULE, 'docker/postgres/Dockerfile', 'FROM postgres:18-alpine'))
})
