import fs from 'node:fs'
import path from 'node:path'
import { contentAfter, deny, readInput, targetPath } from '../lib.ts'

const REQUIRED = ['**/.env', '.git', '.data', 'deploy/data']

const input = readInput()
const file = targetPath(input)
const name = path.basename(file)

const ignore = name.endsWith('.dockerignore') ? contentAfter(input) : null

if (ignore !== null) {
  const entries = ignore.split('\n').map((line) => line.trim().replace(/^\/|\/$/g, ''))
  const missing = REQUIRED.filter((entry) => !entries.includes(entry))
  if (missing.length) {
    deny('dockerignore', `${name} sem ${missing.join(', ')}: o build copiaria segredo ou dados para a imagem.`)
  }
}

const candidates = [`${file}.dockerignore`, path.join(path.dirname(file), '.dockerignore'), path.join(path.dirname(file), '..', '.dockerignore')]

if (/^Dockerfile/.test(name) && !name.endsWith('.dockerignore') && !candidates.some((candidate) => fs.existsSync(candidate))) {
  deny('dockerignore', `${name} sem .dockerignore. Crie antes ${name}.dockerignore ao lado dele, com ${REQUIRED.join(', ')}.`)
}
