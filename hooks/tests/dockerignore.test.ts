import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { allowed, denied, sandbox } from './helpers.ts'

const RULE = 'dockerignore'
const IGNORE = '**/.env\n.git\n.data/\ndeploy/data\nnode_modules\n'

test('accepts an ignore file with .env, .git and data folders', () => {
  allowed(sandbox().write(RULE, 'deploy/Dockerfile.dockerignore', IGNORE))
  allowed(sandbox().write(RULE, '.dockerignore', IGNORE))
})

test('denies an ignore file that lets .env or data into the image', () => {
  denied(sandbox().write(RULE, 'deploy/Dockerfile.dockerignore', 'node_modules\n.git\n'), /\*\*\/\.env, \.data, deploy\/data/)
})

test('denies an edit that removes .env from the ignore file', () => {
  const box = sandbox()
  const file = path.join(box.dir, '.dockerignore')
  fs.writeFileSync(file, IGNORE)
  denied(box.run(RULE, 'Edit', { file_path: file, old_string: '**/.env\n', new_string: '' }), /\.env/)
})

test('denies a Dockerfile without an ignore file and accepts it after the ignore file exists', () => {
  const box = sandbox()
  denied(box.write(RULE, 'deploy/Dockerfile', 'FROM node:24-alpine'), /Dockerfile\.dockerignore/)
  fs.mkdirSync(path.join(box.dir, 'deploy'))
  fs.writeFileSync(path.join(box.dir, 'deploy', 'Dockerfile.dockerignore'), IGNORE)
  allowed(box.write(RULE, 'deploy/Dockerfile', 'FROM node:24-alpine'))
})
